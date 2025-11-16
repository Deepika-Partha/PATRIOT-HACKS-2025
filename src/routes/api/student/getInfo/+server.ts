import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { verifyJwt } from '$lib/server/jwt';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    const user = verifyJwt(token);
    if (!user) return json({ error: 'Not authenticated' }, { status: 401 });

    const student = await students.findOne({ email: user.email });
    if (!student) return json({ error: 'User not found' }, { status: 404 });

    return json({
        name: student.name,
        email: student.email,
        major: student.major || '',
        year: student.year || 1
    });
};
