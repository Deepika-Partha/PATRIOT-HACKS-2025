import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const token = cookies.get('jwt');
    if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

    const user = verifyJwt(token);
    if (!user || typeof user === 'string' || !('id' in user)) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const courseId = formData.get('courseId') as string;
        const courseName = formData.get('courseName') as string;
        const semester = formData.get('semester') as string;
        const year = parseInt(formData.get('year') as string);
        const file = formData.get('file') as File;

        if (!courseId || !courseName || !semester || !file) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Convert file to base64 for storage (in production, use proper file storage)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const fileUrl = `data:${file.type};base64,${base64}`;

        const syllabus = {
            _id: new ObjectId(),
            courseId,
            courseName,
            semester,
            year,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileUrl,
            uploadedAt: new Date()
        };

        const userId = typeof user.id === 'string' ? new ObjectId(user.id) : user.id;
        await students.updateOne(
            { _id: userId },
            { $push: { syllabi: syllabus } } as any
        );

        return json({ success: true, syllabus });
    } catch (error) {
        console.error('Upload error:', error);
        return json({ error: 'Failed to upload syllabus' }, { status: 500 });
    }
};

