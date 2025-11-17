import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { findRelevantCourses } from '$lib/server/gmuCourseCatalog';

/**
 * GET /api/courses/search?q=query
 * Search for courses by code, title, or description
 */
export async function GET({ url }: RequestEvent): Promise<Response> {
  const query = url.searchParams.get('q');
  
  if (!query || query.trim().length < 2) {
    return json({ courses: [] });
  }

  try {
    // Use the findRelevantCourses function which does smart searching
    const courses = findRelevantCourses(query.trim(), []);
    
    // Limit to top 10 suggestions for autocomplete
    const suggestions = courses.slice(0, 10).map(course => ({
      code: course.code,
      title: course.title,
      credits: course.credits,
      description: course.description?.substring(0, 100) || '',
      subject: course.subject
    }));

    return json({ courses: suggestions });
  } catch (error: any) {
    console.error('Course search error:', error);
    return json({ courses: [] }, { status: 500 });
  }
}

