import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';

import type { RequestHandler } from './$types';

async function getStudentData(user: any) {
    if (!user || typeof user === 'string' || !('id' in user)) {
        return null;
    }

    try {
        // Convert string ID to ObjectId if needed
        const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;
        const student = await students.findOne({ _id: userId });
        if (!student) return null;

    return {
        profile: student.profile || {
            gmuId: '',
            name: '',
            major: '',
            minor: null,
            catalogYear: 2024
        },
        credits: student.credits || {
            earned: 0,
            inProgress: 0,
            requiredForDegree: 120,
            gpa: 0.0
        },
        academicHistory: student.academicHistory || [],
        currentSchedule: student.currentSchedule || [],
        degreeProgress: student.degreeProgress || {
            requiredCourses: [],
            electivesRemaining: 6,
            writingIntensive: false
        },
        email: student.email
    };
    } catch (dbError: any) {
        console.error('Database error in getStudentData:', dbError);
        // Return null to indicate error, will be handled by caller
        return null;
    }
}

export const GET: RequestHandler = async ({ cookies }) => {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const user = verifyJwt(token);
        const studentData = await getStudentData(user);
        
        if (!studentData) {
            // Check if it's a database connection error
            return json({ 
                error: 'Database connection failed. Please check your internet connection and try again.' 
            }, { status: 503 });
        }
        
        return json(studentData);
    } catch (error: any) {
        console.error('Error in GET /api/student/getInfo:', error);
        if (error.name === 'MongoNetworkError' || error.message?.includes('ENOTFOUND')) {
            return json({ 
                error: 'Database connection failed. Please check your internet connection and try again.' 
            }, { status: 503 });
        }
        return json({ error: 'Failed to fetch student information' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const user = verifyJwt(token);
        const studentData = await getStudentData(user);
        
        if (!studentData) {
            return json({ 
                error: 'Database connection failed. Please check your internet connection and try again.' 
            }, { status: 503 });
        }
        
        return json(studentData);
    } catch (error: any) {
        console.error('Error in POST /api/student/getInfo:', error);
        if (error.name === 'MongoNetworkError' || error.message?.includes('ENOTFOUND')) {
            return json({ 
                error: 'Database connection failed. Please check your internet connection and try again.' 
            }, { status: 503 });
        }
        return json({ error: 'Failed to fetch student information' }, { status: 500 });
    }
};
