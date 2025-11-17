import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { getCourseByNumber } from '$lib/server/courseCatalog';
import { courseCountsTowardCSDegree } from '$lib/server/parseCSRequirements';
import { ObjectId } from 'mongodb';

export async function POST({ request, cookies }: RequestEvent) {
  const token = cookies.get('jwt');
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });

  const user = verifyJwt(token);
  if (!user || typeof user === 'string' || !('id' in user)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await request.json();

  // Validate that the course exists in the catalog
  const catalogCourse = getCourseByNumber(course.courseId);
  if (!catalogCourse) {
    return json({ error: `Course ${course.courseId} does not exist in the course catalog` }, { status: 400 });
  }

  // Validate grade
  const VALID_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  const GRADES_BELOW_C = ['C-', 'D+', 'D', 'F'];
  const normalizedGrade = course.grade?.toUpperCase().trim();
  
  // Grade to points mapping for comparison
  const gradeToPoints = (grade: string): number => {
    const normalized = grade.toUpperCase().trim();
    const gradePoints: { [key: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    return gradePoints[normalized] || 0.0;
  };
  
  if (!normalizedGrade || !VALID_GRADES.includes(normalizedGrade)) {
    return json({ 
      error: `Invalid grade. Valid grades are: ${VALID_GRADES.join(', ')}` 
    }, { status: 400 });
  }

  // Check if student already has a C- or D grade
  // Per catalog: "may not use more than one course with grade C- or D toward departmental requirements"
  // Note: C (not C-) is allowed multiple times. F is also allowed multiple times.
  const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;
  const student = await students.findOne({ _id: userId });
  
  // Only restrict C- or D grades (not C, not F)
  // C grades are allowed multiple times
  // F grades are allowed multiple times
  if ((normalizedGrade === 'C-' || normalizedGrade === 'D+' || normalizedGrade === 'D') && student?.academicHistory) {
    const hasC = student.academicHistory.some((c: any) => {
      const grade = c.grade?.toUpperCase().trim();
      // Only check for C- or D, not C
      return (grade === 'C-' || grade === 'D+' || grade === 'D') && !c.nullified;
    });
    if (hasC) {
      return json({ 
        error: 'You can only have at most one course with grade C- or D. You already have a C- or D grade in your academic history. Note: C grades (without the minus) and F grades are allowed multiple times.' 
      }, { status: 400 });
    }
  }

  // Determine if course counts toward diploma
  // First check if the course counts toward CS degree based on PDF requirements
  const countsTowardCSDegree = await courseCountsTowardCSDegree(course.courseId);
  
  // Courses below C (C-, D+, D, F) do not count, even if required
  // A course counts if: (1) it counts toward CS degree AND (2) grade is C or above
  const countsTowardDiploma = countsTowardCSDegree && !GRADES_BELOW_C.includes(normalizedGrade);

  // Ensure course data matches catalog
  const courseToAdd = {
    courseId: catalogCourse.courseId,
    title: catalogCourse.title,
    credits: catalogCourse.credits,
    semester: course.semester,
    grade: normalizedGrade,
    required: catalogCourse.required,
    category: catalogCourse.category,
    countsTowardDiploma: countsTowardDiploma
  };

  try {
    // Handle retake logic: keep higher grade, nullify lower grade
    if (course.nullifyOldCourse && course.oldCourseSemester && course.oldCourseGrade) {
      const oldGrade = course.oldCourseGrade.toUpperCase().trim();
      const newGrade = normalizedGrade;
      const oldGradePoints = gradeToPoints(oldGrade);
      const newGradePoints = gradeToPoints(newGrade);
      const oldGradeBelowC = GRADES_BELOW_C.includes(oldGrade);
      const newGradeBelowC = GRADES_BELOW_C.includes(newGrade);
      
      // Determine which grade to keep:
      // Always add the new course to record the retake attempt
      // Nullify the lower grade so only the higher one counts toward degree
      // Special case: If old grade is below C, always nullify it (keep new)
      
      let shouldAddNew = true;
      let shouldNullifyOld = false;
      
      if (oldGradeBelowC) {
        // Old grade is below C, always nullify it and keep new
        shouldNullifyOld = true;
        shouldAddNew = true;
      } else if (newGradeBelowC && !oldGradeBelowC) {
        // New grade is below C but old is not, add new but nullify it (keep old)
        // This allows recording the retake attempt, but old grade counts toward degree
        shouldNullifyOld = false;
        shouldAddNew = true;
        // Mark the new course as not counting toward diploma
        courseToAdd.countsTowardDiploma = false;
      } else {
        // Both are C or above, or both are below C - keep the higher grade
        if (newGradePoints > oldGradePoints) {
          // New grade is higher, nullify old and add new
          shouldNullifyOld = true;
          shouldAddNew = true;
        } else if (oldGradePoints > newGradePoints) {
          // Old grade is higher, nullify new (add it but mark as not counting)
          shouldNullifyOld = false;
          shouldAddNew = true;
          courseToAdd.countsTowardDiploma = false;
        } else {
          // Grades are equal, nullify old and add new (record the retake)
          shouldNullifyOld = true;
          shouldAddNew = true;
        }
      }
      
      // Nullify old course if needed
      if (shouldNullifyOld) {
        await students.updateOne(
          { 
            _id: userId,
            'academicHistory.courseId': catalogCourse.courseId,
            'academicHistory.semester': course.oldCourseSemester,
            'academicHistory.grade': course.oldCourseGrade
          },
          { 
            $set: { 
              'academicHistory.$.nullified': true 
            } 
          }
        );
      }
      
      // Always add the new course to record the retake attempt
      // The countsTowardDiploma flag and nullified flag determine which one counts
      if (shouldAddNew) {
        await students.updateOne(
          { _id: userId },
          { $push: { academicHistory: courseToAdd } }
        );
      }
    } else {
      // Not a retake, just add the new course
      await students.updateOne(
        { _id: userId },
        { $push: { academicHistory: courseToAdd } }
      );
    }

    return json({ success: true });
  } catch (dbError: any) {
    console.error('Database error:', dbError);
    
    // Handle MongoDB connection errors
    if (dbError.name === 'MongoNetworkError' || dbError.message?.includes('ENOTFOUND')) {
      return json({ 
        error: 'Database connection failed. Please check your internet connection and try again.' 
      }, { status: 503 });
    }
    
    return json({ 
      error: 'Failed to save course. Please try again.' 
    }, { status: 500 });
  }
}

