// updateProfile
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';

export async function POST({ request, cookies }: RequestEvent) {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    const user = verifyJwt(token);
    if (!user || typeof user === 'string' || !('id' in user)) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { profile: profileData, email: newEmail, year } = await request.json();
    
    if (!profileData || !profileData.name || !profileData.gmuId || !profileData.major) {
        return json({ error: 'Name, GMU ID, and Major are required' }, { status: 400 });
    }

    if (year && (year < 1 || year > 4)) {
        return json({ error: 'Year must be between 1 and 4' }, { status: 400 });
    }

    // Convert string ID to ObjectId if needed
    const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;
    
    const updateData: any = {
        'profile.name': profileData.name,
        'profile.gmuId': profileData.gmuId,
        'profile.major': profileData.major,
        'profile.minor': profileData.minor || null,
        'profile.catalogYear': profileData.catalogYear || 2024
    };

    if (newEmail) {
        updateData.email = newEmail;
    }

    if (year) {
        updateData['profile.year'] = year;
    }

    const result = await students.updateOne(
        { _id: userId },
        { $set: updateData }
    );
    
    if (result.matchedCount === 0) return json({ error: 'User not found' }, { status: 404 });

    return json({ success: true, message: 'Profile updated successfully' });
};
