import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';

export async function POST({ request, cookies }: RequestEvent) {
  const token = cookies.get('jwt');
  const user = verifyJwt(token);

  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const newSchedule = await request.json();

  await students.updateOne(
    { _id: user.id },
    { $set: { currentSchedule: newSchedule } }
  );

  return json({ success: true });
}

