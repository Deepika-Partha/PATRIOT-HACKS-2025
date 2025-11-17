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

  const { tasks, events } = await request.json();

  if (!user.id) {
    return json({ error: "Invalid user ID" }, { status: 400 });
  }

  const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;

  try {
    const updateData: any = {};
    if (tasks !== undefined) {
      updateData.tasks = tasks;
    }
    if (events !== undefined) {
      updateData.events = events;
    }

    const result = await students.updateOne(
      { _id: userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return json({ error: "Student not found" }, { status: 404 });
    }

    return json({ success: true, message: "Tasks and events updated successfully" });
  } catch (dbError: any) {
    console.error('Database error:', dbError);
    
    if (dbError.name === 'MongoNetworkError' || dbError.message?.includes('ENOTFOUND')) {
      return json({ 
        error: 'Database connection failed. Please check your internet connection and try again.' 
      }, { status: 503 });
    }
    
    return json({ 
      error: 'Failed to update tasks. Please try again.' 
    }, { status: 500 });
  }
}

