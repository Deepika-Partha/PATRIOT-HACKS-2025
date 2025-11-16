import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';

export async function GET({ cookies }: RequestEvent) {
  const token = cookies.get('jwt');
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });

  const user = verifyJwt(token);
  if (!user || typeof user === 'string' || !('id' in user)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure we have a valid user ID
  if (!user.id) {
    return json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Convert string ID to ObjectId if needed
  const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;

  const student = await students.findOne({ _id: userId });
  if (!student) return json({ error: "Student not found" }, { status: 404 });

  return json({ currentSchedule: student.currentSchedule || [] });
}

