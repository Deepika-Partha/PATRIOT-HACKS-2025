import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';

export async function POST({ request, cookies }: RequestEvent) {
  const token = cookies.get('jwt');
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });

  const user = verifyJwt(token);
  if (!user || typeof user === 'string' || !('id' in user)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const newSchedule = await request.json();

  // Convert string ID to ObjectId if needed
  const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;

  try {
    await students.updateOne(
      { _id: userId },
      { $set: { currentSchedule: newSchedule } }
    );

    return json({ success: true });
  } catch (dbError: any) {
    console.error('Database error:', dbError);
    
    // Handle MongoDB connection errors
    if (dbError.name === 'MongoNetworkError' || dbError.message?.includes('ENOTFOUND')) {
      return json({ 
        error: 'Database connection failed. Please check your internet connection and try again.' 
      }, { status: 503 });
    }
    
    return json({ 
      error: 'Failed to update schedule. Please try again.' 
    }, { status: 500 });
  }
}

