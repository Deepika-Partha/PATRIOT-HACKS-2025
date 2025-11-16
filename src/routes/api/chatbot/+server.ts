/**
 * POST /api/chatbot - Simple chatbot endpoint
 * 
 * This is YOUR part - the conversational interface.
 * Your teammates will provide the actual functionality:
 * - Degree Works parsing/data
 * - Google Calendar integration
 * 
 * This endpoint just handles the chat conversation and routes to their implementations.
 * 
 * ## Testing
 * 
 * ```bash
 * curl -X POST http://localhost:5173/api/chatbot \
 *   -H "Content-Type: application/json" \
 *   -d '{"message": "What classes should I take?"}'
 * ```
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';

// Initialize Anthropic client (only if API key is present)
const anthropic = ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  : null;

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatResponse {
  reply: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * POST handler for /api/chatbot
 * 
 * This is the core chatbot - it takes a message and returns a response.
 * Now includes user context and saves conversation history to database.
 */
export async function POST({ request, cookies }: RequestEvent): Promise<Response> {
  try {
    // Authenticate user
    const token = cookies.get('jwt');
    if (!token) {
      return json({ reply: 'Please log in to use the chatbot.' }, { status: 401 });
    }

    const user = verifyJwt(token);
    if (!user || typeof user === 'string' || !user.id) {
      return json({ reply: 'Please log in to use the chatbot.' }, { status: 401 });
    }

    // Get student data from database
    let student;
    try {
      student = await students.findOne({ _id: new ObjectId(user.id as string) });
    } catch (e) {
      return json({ reply: 'User not found.' }, { status: 404 });
    }

    if (!student) {
      return json({ reply: 'User not found.' }, { status: 404 });
    }

    // Parse request body
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return json(
        { reply: 'Invalid request. Please send a message.' },
        { status: 400 }
      );
    }

    const { message } = body;

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return json(
        { reply: 'Please provide a message.' },
        { status: 400 }
      );
    }

    // Load conversation history from database (or use empty array)
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (student.chatbotHistory && Array.isArray(student.chatbotHistory)) {
      conversationHistory = student.chatbotHistory;
    }

    // Build user context for the AI
    const userContext = {
      name: student.name || 'Student',
      major: student.major || 'Undeclared',
      year: student.year || 1,
      email: student.email || '',
      completedCourses: student.academicHistory || [],
      currentSchedule: student.currentSchedule || [],
      creditsEarned: student.creditsEarned || 0,
      creditsInProgress: student.creditsInProgress || 0,
      gpa: student.gpa || 0.0,
    };

    let reply: string;

    if (anthropic) {
      // Use Claude Haiku to power the chatbot
      try {
        // Build system message with user context
        const systemMessage = `You are a helpful academic advisor chatbot for George Mason University students.

STUDENT CONTEXT:
- Name: ${userContext.name}
- Major: ${userContext.major}
- Year: ${userContext.year}
- GPA: ${userContext.gpa.toFixed(2)}
- Credits Earned: ${userContext.creditsEarned}
- Credits In Progress: ${userContext.creditsInProgress}

${userContext.completedCourses.length > 0 
  ? `Completed Courses: ${userContext.completedCourses.map((c: any) => c.courseId || c.title || c).join(', ')}` 
  : 'No completed courses yet.'}

${userContext.currentSchedule.length > 0 
  ? `Current Schedule: ${userContext.currentSchedule.map((c: any) => `${c.courseId || c.title || c} (${c.days || ''} ${c.time || ''})`).join(', ')}` 
  : 'No courses scheduled for current semester.'}

INSTRUCTIONS:
- Be friendly, concise, and helpful
- Use the student's actual information when providing advice
- Reference their completed courses, current schedule, and progress when relevant
- Help with course planning, scheduling, and degree requirements
- If you don't have specific information, acknowledge it but still be helpful`;

        // Build messages array for Anthropic
        const messages = conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        }));

        // Add the current user message
        messages.push({
          role: 'user' as const,
          content: message,
        });

        const completion = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          system: systemMessage,
          messages: messages.slice(-20), // Keep last 20 messages for context
        });

        reply = completion.content[0]?.type === 'text' 
          ? completion.content[0].text.trim()
          : "I'm here to help with your course planning! What would you like to know?";

      } catch (error) {
        console.error('[chat-api] Anthropic error:', error);
        reply = getFallbackResponse(message);
      }
    } else {
      // Fallback: Simple keyword-based responses (works without API key)
      reply = getFallbackResponse(message);
    }

    // Update conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: reply },
    ].slice(-50); // Keep last 50 messages in database

    // Save conversation history to database
    try {
      await students.updateOne(
        { _id: new ObjectId(user.id as string) },
        { $set: { chatbotHistory: updatedHistory } }
      );
    } catch (dbError) {
      console.error('[chat-api] Database error saving history:', dbError);
      // Continue even if saving fails
    }

    return json({
      reply,
      conversationHistory: updatedHistory,
    });

  } catch (error) {
    console.error('[chat-api] Error:', error);
    return json(
      { reply: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for /api/chatbot - Retrieve conversation history
 */
export async function GET({ cookies }: RequestEvent): Promise<Response> {
  try {
    const token = cookies.get('jwt');
    if (!token) {
      return json({ conversationHistory: [] }, { status: 200 });
    }

    const user = verifyJwt(token);
    if (!user || typeof user === 'string' || !user.id) {
      return json({ conversationHistory: [] }, { status: 200 });
    }

    // Get conversation history from database
    try {
      const student = await students.findOne({ _id: new ObjectId(user.id as string) });
      if (student && student.chatbotHistory && Array.isArray(student.chatbotHistory)) {
        return json({ conversationHistory: student.chatbotHistory });
      }
    } catch (e) {
      console.error('[chat-api] Error loading history:', e);
    }

    return json({ conversationHistory: [] });
  } catch (error) {
    console.error('[chat-api] Error:', error);
    return json({ conversationHistory: [] }, { status: 200 });
  }
}

/**
 * Simple fallback responses when Anthropic API is not available
 * This ensures the chatbot works even without an API key
 */
function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();

  // Basic intent detection for demo purposes
  if (lower.includes('hello') || lower.includes('hi')) {
    return "Hi! I'm your GMU academic advisor chatbot. I can help you plan your courses and schedule. What would you like to know?";
  }

  if (lower.includes('help')) {
    return "I can help you with:\n• Course planning and recommendations\n• Checking degree requirements\n• Scheduling classes\n\nOnce your teammates integrate Degree Works and Google Calendar, I'll have even more information to help you!";
  }

  if (lower.includes('course') || lower.includes('class')) {
    return "I can help with course planning! Right now I'm in demo mode. Once we integrate with Degree Works, I'll be able to see your specific requirements and suggest courses for you.";
  }

  if (lower.includes('schedule') || lower.includes('calendar')) {
    return "I can help with scheduling! Once we integrate with Google Calendar, I'll be able to add courses directly to your calendar and check for conflicts.";
  }

  if (lower.includes('requirement') || lower.includes('degree')) {
    return "I can check your degree requirements! Once we have Degree Works integrated, I'll be able to show you exactly what you need to graduate.";
  }

  // Default response
  return `I received your question: "${message}"\n\nI'm currently in demo mode. Once your teammates integrate Degree Works and Google Calendar, I'll be able to give you much more specific help!\n\nFor now, try asking about courses, schedules, or degree requirements.`;
}

