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
  
  if (!normalizedGrade || !VALID_GRADES.includes(normalizedGrade)) {
    return json({ 
      error: `Invalid grade. Valid grades are: ${VALID_GRADES.join(', ')}` 
    }, { status: 400 });
  }

  // Check if student already has a C grade
  const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;
  const student = await students.findOne({ _id: userId });
  
  if (normalizedGrade === 'C' && student?.academicHistory) {
    const hasC = student.academicHistory.some((c: any) => 
      c.grade && c.grade.toUpperCase().trim() === 'C' && !c.nullified
    );
    if (hasC) {
      return json({ 
        error: 'You can only have at most one C grade. You already have a C grade in your academic history.' 
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
    // If nullifying old course, update it first
    if (course.nullifyOldCourse && course.oldCourseSemester && course.oldCourseGrade) {
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

    // Add the new course
    await students.updateOne(
      { _id: userId },
      { $push: { academicHistory: courseToAdd } }
    );

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

