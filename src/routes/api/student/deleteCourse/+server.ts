import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';

// Helper function to check if a grade counts toward degree (C or above)
function gradeCountsTowardDegree(grade: string): boolean {
  if (!grade) return false;
  const gradeUpper = grade.toUpperCase().trim();
  const passingGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
  return passingGrades.includes(gradeUpper);
}

// Calculate GPA from letter grade
function getGradePoints(grade: string): number {
  const gradeMap: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  };
  return gradeMap[grade.toUpperCase().trim()] || 0.0;
}

// Recalculate credits and GPA based on academic history
async function recalculateCredits(userId: ObjectId) {
  const student = await students.findOne({ _id: userId });
  if (!student || !student.academicHistory) return;

  const academicHistory = student.academicHistory || [];
  
  let totalCredits = 0;
  let totalGradePoints = 0;
  let totalGradedCredits = 0;

  for (const course of academicHistory) {
    const credits = course.credits || 0;
    const grade = course.grade || '';
    
    // Count credits only if grade is C or above
    if (gradeCountsTowardDegree(grade)) {
      totalCredits += credits;
    }
    
    // Calculate GPA for all graded courses
    const gradePoints = getGradePoints(grade);
    if (gradePoints > 0 || grade.toUpperCase() === 'F') {
      totalGradePoints += gradePoints * credits;
      totalGradedCredits += credits;
    }
  }

  const gpa = totalGradedCredits > 0 ? totalGradePoints / totalGradedCredits : 0.0;

  // Get current schedule credits
  const currentSchedule = student.currentSchedule || [];
  const inProgressCredits = currentSchedule.reduce((sum: number, course: any) => {
    return sum + (course.credits || 0);
  }, 0);

  // Update credits in database
  await students.updateOne(
    { _id: userId },
    {
      $set: {
        credits: {
          earned: totalCredits,
          inProgress: inProgressCredits,
          requiredForDegree: 120,
          gpa: parseFloat(gpa.toFixed(2))
        },
        creditsEarned: totalCredits,
        gpa: parseFloat(gpa.toFixed(2))
      }
    }
  );
}

export async function POST({ request, cookies }: RequestEvent) {
  const token = cookies.get('jwt');
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });

  const user = verifyJwt(token);
  if (!user || typeof user === 'string' || !('id' in user)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId, semester, grade } = await request.json();

  if (!courseId) {
    return json({ error: "Course ID is required" }, { status: 400 });
  }

  // Convert string ID to ObjectId if needed
  const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;

  try {
    // Remove the course from academic history
    const result = await students.updateOne(
      { _id: userId },
      { 
        $pull: { 
          academicHistory: { 
            courseId: courseId,
            semester: semester,
            grade: grade
          } 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return json({ error: "Course not found" }, { status: 404 });
    }

    // Recalculate credits and GPA
    await recalculateCredits(userId);

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
      error: 'Failed to delete course. Please try again.' 
    }, { status: 500 });
  }
}
