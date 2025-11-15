import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { students } from '$lib/server/db';
import { signJwt } from '$lib/server/jwt';

export async function POST({ request, cookies }: RequestEvent) {
  const { email, password } = await request.json();

  const student = await students.findOne({ email });
  if (!student)
    return json({ error: "User not found"}, { status: 400 });

  const matches = await bcrypt.compare(password, student.password);

  if (!matches)
    return json({ error: "Invalid password" }, { status: 400 });

  const token = signJwt({ id: student._id });

  cookies.set('jwt', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  return json({ success: true });
}
