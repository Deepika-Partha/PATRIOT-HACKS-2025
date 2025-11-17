import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllCourses } from '$lib/server/courseCatalog';

/**
 * API endpoint to search courses in the catalog
 * GET /api/courses/search?q=query
 * Returns courses matching the query (searches courseId and title)
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    if (!query || query.trim().length === 0) {
      return json({ courses: [] });
    }

    const allCourses = getAllCourses();
    const normalizedQuery = query.toUpperCase().trim();
    
    // Filter courses that match the query
    const matchingCourses = allCourses
      .filter(course => {
        const courseIdMatch = course.courseId.toUpperCase().includes(normalizedQuery);
        const titleMatch = course.title.toUpperCase().includes(normalizedQuery);
        return courseIdMatch || titleMatch;
      })
      .slice(0, limit)
      .map(course => ({
        courseId: course.courseId,
        title: course.title,
        credits: course.credits,
        required: course.required,
        category: course.category,
        prerequisites: course.prerequisites
      }));

    return json({ courses: matchingCourses });
  } catch (error: any) {
    console.error('Error searching courses:', error);
    return json({ 
      error: 'Failed to search courses',
      details: error.message 
    }, { status: 500 });
  }
};

