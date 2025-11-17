import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { courseCountsTowardCSDegree } from '$lib/server/parseCSRequirements';

/**
 * API endpoint to check if a course counts toward CS degree
 * GET /api/courses/countsTowardDegree/[courseId]
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { courseId } = params;
    if (!courseId) {
      return json({ error: 'Course ID is required' }, { status: 400 });
    }

    const counts = await courseCountsTowardCSDegree(courseId);
    return json({ courseId, countsTowardDegree: counts });
  } catch (error: any) {
    console.error('Error checking if course counts toward degree:', error);
    return json({ 
      error: 'Failed to check course',
      details: error.message 
    }, { status: 500 });
  }
};

