import { json } from '@sveltejs/kit';
import { getAllRequiredCourses } from '$lib/server/courseCatalog';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    const requiredCourses = getAllRequiredCourses();
    return json(requiredCourses);
};

