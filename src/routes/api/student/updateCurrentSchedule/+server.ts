import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';

export async function POST({ request, cookies }: RequestEvent) {
  const token = cookies.get('jwt');
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });

  const user = verifyJwt(token);
  if (!user || typeof user === 'string' || !('id' in user)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const newSchedule = await request.json();

  // Ensure we have a valid user ID
  if (!user.id) {
    return json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Convert string ID to ObjectId if needed
  const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;

  try {
    const result = await students.updateOne(
      { _id: userId },
      { $set: { currentSchedule: newSchedule } }
    );

    if (result.matchedCount === 0) {
      return json({ error: "Student not found" }, { status: 404 });
    }

    return json({ success: true, message: "Schedule updated successfully" });
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

