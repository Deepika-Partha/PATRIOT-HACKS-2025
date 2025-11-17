/**
 * POST /api/chatbot/clear - Clear chat history
 * 
 * Clears the conversation history for the authenticated user
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';

/**
 * POST handler to clear chat history
 */
export async function POST({ cookies }: RequestEvent): Promise<Response> {
  try {
    // Authenticate user
    const token = cookies.get('jwt');
    if (!token) {
      return json({ error: 'Please log in to clear chat history.' }, { status: 401 });
    }

    const user = verifyJwt(token);
    if (!user || typeof user === 'string' || !user.id) {
      return json({ error: 'Please log in to clear chat history.' }, { status: 401 });
    }

    // Clear chat history in database
    try {
      await students.updateOne(
        { _id: new ObjectId(user.id as string) },
        { $set: { chatbotHistory: [] } }
      );
      
      return json({ success: true, message: 'Chat history cleared successfully' });
    } catch (dbError) {
      console.error('[chatbot-clear] Database error:', dbError);
      return json(
        { error: 'Failed to clear chat history' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[chatbot-clear] Error:', error);
    return json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

