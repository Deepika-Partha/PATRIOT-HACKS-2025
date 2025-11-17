import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { students } from '$lib/server/db';
import { signJwt } from '$lib/server/jwt';


export async function POST({ request, cookies }: RequestEvent) {
  const { email, password, name, gmuId, major } = await request.json();

  const existing = await students.findOne({ email });
  if (existing) return json({ error: "Email already exists" }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);

  const newStudent = {
    email,
    password: hash,
    createdAt: new Date(),

    profile: {
      gmuId,
      name,
      major,
      minor: null,
      catalogYear: 2024
    },

    credits: {
      earned: 0,
      inProgress: 0,
      requiredForDegree: 120,
      gpa: 0.0
    },

    academicHistory: [],
    currentSchedule: [],
    tasks: [],
    events: [],
    degreeProgress: {
      requiredCourses: [],
      electivesRemaining: 6,
      writingIntensive: false
    }
  };

  const res = await students.insertOne(newStudent);

  const token = signJwt({ id: res.insertedId });

  cookies.set('jwt', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  return json({ success: true });
}
