import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseCSRequirements } from '$lib/server/parseCSRequirements';

/**
 * API endpoint to parse CS1.pdf and return course requirements
 * GET /api/courses/parseCSRequirements
 */
export const GET: RequestHandler = async () => {
  try {
    const requirements = await parseCSRequirements();
    return json({ success: true, requirements });
  } catch (error: any) {
    console.error('Error parsing CS requirements:', error);
    return json({ 
      error: 'Failed to parse CS requirements',
      details: error.message 
    }, { status: 500 });
  }
};

