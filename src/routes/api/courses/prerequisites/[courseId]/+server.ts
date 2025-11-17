import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCourseByNumber } from '$lib/server/courseCatalog';
import { getPrerequisites } from '$lib/server/parseCSRequirements';

/**
 * API endpoint to get prerequisites for a course
 * GET /api/courses/prerequisites/[courseId]
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { courseId } = params;
    if (!courseId) {
      return json({ error: 'Course ID is required' }, { status: 400 });
    }

    // First check the static catalog
    const catalogCourse = getCourseByNumber(courseId);
    let prerequisites: string[] = [];
    
    if (catalogCourse?.prerequisites) {
      prerequisites = catalogCourse.prerequisites;
    } else {
      // Fallback to PDF parsing
      prerequisites = await getPrerequisites(courseId);
    }

    return json({ courseId, prerequisites });
  } catch (error: any) {
    console.error('Error getting prerequisites:', error);
    return json({ 
      error: 'Failed to get prerequisites',
      details: error.message 
    }, { status: 500 });
  }
};

