import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';

export async function GET({ cookies }: RequestEvent) {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    const user = verifyJwt(token);
    if (!user || typeof user === 'string') {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find student by ID from JWT token
    let student;
    if (user.id) {
        try {
            student = await students.findOne({ _id: new ObjectId(user.id as string) });
        } catch (e) {
            // If ObjectId conversion fails, return error
            return json({ error: 'Invalid user ID' }, { status: 400 });
        }
    } else {
        return json({ error: 'User ID not found in token' }, { status: 400 });
    }
    
    if (!student) return json({ error: 'User not found' }, { status: 404 });

    // Return all the data the dashboard needs
    return json({
        profile: {
            name: student.name || '',
            email: student.email || '',
            gmuId: student.gmuId || '',
            major: student.major || '',
            year: student.year || 1
        },
        academicHistory: student.academicHistory || [],
        currentSchedule: student.currentSchedule || [],
        degreeProgress: {
            requiredCourses: student.requiredCourses || [],
            electivesRemaining: student.electivesRemaining || 0,
            writingIntensive: student.writingIntensive || false
        },
        credits: {
            earned: student.creditsEarned || 0,
            inProgress: student.creditsInProgress || 0,
            requiredForDegree: student.creditsRequired || 120,
            gpa: student.gpa || 0.0
        }
    });
}

