import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, cookies }) => {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    const user = verifyJwt(token);
    if (!user || typeof user === 'string' || !('id' in user)) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        // Handle both string and ObjectId formats
        let syllabusId: ObjectId;
        try {
            syllabusId = new ObjectId(params.id);
        } catch {
            return json({ error: 'Invalid syllabus ID' }, { status: 400 });
        }
        
        const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;
        
        // Try both ObjectId and string comparison
        const result = await students.updateOne(
            { _id: userId },
            { $pull: { syllabi: { $or: [{ _id: syllabusId }, { _id: params.id }] } } }
        );

        if (result.matchedCount === 0) {
            return json({ error: 'Syllabus not found' }, { status: 404 });
        }

        return json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return json({ error: 'Failed to delete syllabus' }, { status: 500 });
    }
};

