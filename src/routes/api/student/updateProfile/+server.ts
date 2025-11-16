// updateProfile
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';

export async function POST({ request, cookies }: RequestEvent) {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    const user = verifyJwt(token);
    if (!user) return json({ error: 'Not authenticated' }, { status: 401 });

    const { major, year } = await request.json();
    if (!major || !year) return json({ error: 'Major and year are required' }, { status: 400 });
    if (year < 1 || year > 4) return json({ error: 'Year must be between 1 and 4' }, { status: 400 });

    const result = await students.updateOne({ email: user.email }, { $set: { major, year } });
    if (result.matchedCount === 0) return json({ error: 'User not found' }, { status: 404 });

    return json({ success: true, message: 'Profile updated successfully' });
};
