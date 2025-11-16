import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scrapeGMUCSRequirements, scrapeAllGMUCourses } from '$lib/server/gmuScraper';

/**
 * API endpoint to scrape GMU CS requirements
 * GET /api/courses/scrape?type=requirements
 */
export const GET: RequestHandler = async ({ url }) => {
  const type = url.searchParams.get('type');
  
  try {
    if (type === 'requirements') {
      const requirements = await scrapeGMUCSRequirements();
      return json({ success: true, data: requirements });
    } else if (type === 'all') {
      const courses = await scrapeAllGMUCourses();
      return json({ success: true, data: courses });
    } else {
      return json({ error: 'Invalid type parameter. Use "requirements" or "all"' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Scraping error:', error);
    return json({ 
      error: 'Failed to scrape GMU data. Please try again later.',
      details: error.message 
    }, { status: 500 });
  }
};

