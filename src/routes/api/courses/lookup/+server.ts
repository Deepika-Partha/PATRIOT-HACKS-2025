import { json } from '@sveltejs/kit';
import { getCourseByNumber } from '$lib/server/courseCatalog';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const courseNumber = url.searchParams.get('number');
    
    if (!courseNumber) {
        return json({ error: 'Course number is required' }, { status: 400 });
    }
    
    const course = getCourseByNumber(courseNumber);
    
    if (!course) {
        return json({ error: `Course ${courseNumber} does not exist in the course catalog` }, { status: 404 });
    }
    
    return json(course);
};

