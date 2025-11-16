import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    const user = verifyJwt(token);
    if (!user || typeof user === 'string' || !('id' in user)) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;
    const student = await students.findOne({ _id: userId });
    
    if (!student) return json({ error: 'User not found' }, { status: 404 });

    const syllabi = (student.syllabi || []).map((s: any) => ({
        ...s,
        _id: s._id.toString() // Convert ObjectId to string for JSON serialization
    }));
    
    return json(syllabi);
};

