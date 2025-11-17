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
import { env } from '$env/dynamic/private';
import { students } from '$lib/server/db';
import { verifyJwt } from '$lib/server/jwt';
import { ObjectId } from 'mongodb';
import { 
  getAllCourses, 
  canTakeCourse, 
  getAvailableCourses, 
  getMissingPrerequisites,
  getCourseByCode,
  findRelevantCourses,
  getSubjectSummary,
  getRecommendedCourses,
  getCourseAlternatives,
  getPrerequisiteChain,
  getNextLevelCourses
} from '$lib/server/gmuCourseCatalog';

// Initialize Anthropic client (only if API key is present)
// Note: We'll initialize it per-request to ensure env vars are loaded

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatResponse {
  reply: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Intent types for different queries
 */
type QueryIntent = 'general_recommendation' | 'specific_course' | 'general_query';

/**
 * Detect the user's intent from their message
 */
function detectIntent(message: string): { intent: QueryIntent; courseCodes: string[] } {
  const lower = message.toLowerCase();
  
  // Extract course codes (e.g., "CS 310", "ECE 232")
  const courseCodePattern = /\b([A-Z]{2,4})\s+(\d{3,4}[A-Z]?)\b/gi;
  const courseCodes: string[] = [];
  let match;
  while ((match = courseCodePattern.exec(message)) !== null) {
    courseCodes.push(`${match[1]} ${match[2]}`.toUpperCase());
  }
  
  // Check for specific course questions
  if (courseCodes.length > 0) {
    const specificCoursePatterns = [
      /should i take/i,
      /is .+ good/i,
      /tell me about/i,
      /what is/i,
      /how is/i,
      /worth taking/i,
      /recommend .+ over/i,
      /versus|vs\./i,
      /compare/i,
      /better/i,
      /or should i/i
    ];
    
    if (specificCoursePatterns.some(pattern => pattern.test(message))) {
      return { intent: 'specific_course', courseCodes };
    }
  }
  
  // Check for general recommendation patterns
  const recommendationPatterns = [
    /what (class|course|classes|courses) should i take/i,
    /what (should i|do i|can i) take/i,
    /recommend (a |some )?(class|course|classes|courses)/i,
    /suggest (a |some )?(class|course|classes|courses)/i,
    /next semester/i,
    /what.*available/i,
    /help me (pick|choose|select)/i,
    /need (to|help) (pick|choose|select)/i
  ];
  
  if (recommendationPatterns.some(pattern => pattern.test(message))) {
    return { intent: 'general_recommendation', courseCodes };
  }
  
  return { intent: 'general_query', courseCodes };
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

    // Extract completed course codes for prerequisite checking
    const completedCourseCodes = userContext.completedCourses.map((c: any) => 
      (c.courseId || c.title || c).toString().toUpperCase().trim()
    ).filter(Boolean);

    // Detect user intent
    const { intent, courseCodes } = detectIntent(message);
    console.log('[chatbot] Detected intent:', intent, 'Course codes:', courseCodes);

    // Get subject summary (just counts, not full details)
    const subjectSummary = getSubjectSummary();

    let reply: string;

    // Initialize Anthropic client with dynamic env (loads at runtime)
    const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    console.log('[chatbot] ANTHROPIC_API_KEY loaded:', ANTHROPIC_API_KEY ? 'YES (length: ' + ANTHROPIC_API_KEY.length + ')' : 'NO');
    const anthropic = ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: ANTHROPIC_API_KEY })
      : null;
    
    console.log('[chatbot] anthropic client:', anthropic ? 'initialized' : 'null - using fallback');
    
    if (anthropic) {
      // Use Claude Haiku to power the chatbot
      try {
        // Format subject summary (just counts)
        const subjectSummaryText = Object.entries(subjectSummary)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subject, count]) => `${subject}: ${count} courses`)
          .join(', ');

        let contextSection = '';
        
        // Build context based on intent
        if (intent === 'general_recommendation') {
          // Get personalized recommendations for next semester
          const recommendedCourses = getRecommendedCourses(
            completedCourseCodes,
            userContext.major,
            userContext.year,
            15
          );
          
          if (recommendedCourses.length > 0) {
            const recList = recommendedCourses.map(c => {
              const prereqInfo = c.prerequisites && c.prerequisites.length > 0
                ? ` [Prerequisites: ${c.prerequisites.join(', ')}]`
                : ' [No prerequisites]';
              const prereqChain = getPrerequisiteChain(c.code);
              const unlocksCount = prereqChain.unlockedCourses.length;
              const unlockInfo = unlocksCount > 0 ? ` (Unlocks ${unlocksCount} courses)` : '';
              const desc = c.description.length > 120 
                ? c.description.substring(0, 120) + '...'
                : c.description;
              return `  ${c.code}: ${c.title} (${c.credits || 'N/A'} credits)${prereqInfo}${unlockInfo}\n    ${desc}`;
            }).join('\n\n');
            
            contextSection = `\n\nRECOMMENDED COURSES FOR NEXT SEMESTER (personalized for ${userContext.major} majors):\n${recList}\n\nThese courses are prioritized based on your major, year level, and what they unlock for your future semesters.`;
          } else {
            contextSection = '\n\nNo recommended courses found based on your current progress. You may have completed most requirements, or need to take prerequisite courses first.';
          }
          
        } else if (intent === 'specific_course' && courseCodes.length > 0) {
          // Get details and alternatives for specific course(s)
          const courseDetails = courseCodes.map(courseCode => {
            const alternatives = getCourseAlternatives(courseCode, completedCourseCodes, userContext.major);
            const chain = getPrerequisiteChain(courseCode);
            
            if (!alternatives.targetCourse) {
              return `  ${courseCode}: Course not found in catalog`;
            }
            
            const course = alternatives.targetCourse;
            const canTake = canTakeCourse(courseCode, completedCourseCodes);
            const status = canTake ? '✓ Can take (prerequisites met)' : `✗ Cannot take yet`;
            const missing = getMissingPrerequisites(courseCode, completedCourseCodes);
            const missingText = missing.length > 0 ? ` - Missing: ${missing.join(', ')}` : '';
            
            let details = `  ${course.code}: ${course.title}\n`;
            details += `    Credits: ${course.credits || 'N/A'}\n`;
            details += `    Status: ${status}${missingText}\n`;
            details += `    Description: ${course.description}\n`;
            
            if (chain.directPrerequisites.length > 0) {
              details += `    Prerequisites: ${chain.directPrerequisites.map(p => p.code).join(', ')}\n`;
            }
            
            if (chain.unlockedCourses.length > 0) {
              details += `    Unlocks: ${chain.unlockedCourses.slice(0, 5).map(c => c.code).join(', ')}${chain.unlockedCourses.length > 5 ? ` and ${chain.unlockedCourses.length - 5} more` : ''}\n`;
            }
            
            if (alternatives.sameSubjectAlternatives.length > 0) {
              details += `    Same-subject alternatives you can take: ${alternatives.sameSubjectAlternatives.map(a => a.code).join(', ')}\n`;
            }
            
            if (alternatives.prerequisiteAlternatives.length > 0) {
              details += `    Prerequisites you need first: ${alternatives.prerequisiteAlternatives.map(a => a.code).join(', ')}\n`;
            }
            
            return details;
          }).join('\n\n');
          
          contextSection = `\n\nCOURSE COMPARISON & DETAILS:\n${courseDetails}\n\nUse this information to provide advisor-style reasoning about whether the student should take this course, alternatives, or prerequisites needed.`;
          
        } else {
          // General query - use relevant course search
          const relevantCourses = findRelevantCourses(message, completedCourseCodes);
          const availableRelevantCourses = relevantCourses.filter(course => 
            canTakeCourse(course.code, completedCourseCodes)
          );
          
          if (relevantCourses.length > 0) {
            const coursesList = relevantCourses.map(c => {
              const prereqInfo = c.prerequisites && c.prerequisites.length > 0
                ? ` [Prerequisites: ${c.prerequisites.join(', ')}]`
                : ' [No prerequisites]';
              const canTake = canTakeCourse(c.code, completedCourseCodes);
              const status = canTake ? '✓ Can take' : `✗ Missing: ${getMissingPrerequisites(c.code, completedCourseCodes).join(', ') || 'prerequisites'}`;
              const desc = c.description.length > 150 
                ? c.description.substring(0, 150) + '...'
                : c.description;
              return `  ${c.code}: ${c.title} (${c.credits || 'N/A'} credits)${prereqInfo} - ${status}\n    ${desc}`;
            }).join('\n\n');
            contextSection = `\n\nRELEVANT COURSES (matching your query):\n${coursesList}`;
          } else {
            contextSection = '\n\n  • No specific courses matched this query - ask about specific courses or subjects';
          }
        }

        // Build system message with user context and intent-based context
        const systemMessage = `You are a helpful academic advisor chatbot for George Mason University students.

IMPORTANT: You have FULL ACCESS to the student's academic data from their dashboard, including all courses they've completed and their current schedule. This data is loaded directly from the database.

STUDENT PROFILE:
- Name: ${userContext.name}
- Major: ${userContext.major}
- Year: ${userContext.year}
- GPA: ${userContext.gpa.toFixed(2)}
- Credits Earned: ${userContext.creditsEarned}
- Credits In Progress: ${userContext.creditsInProgress}

STUDENT'S COMPLETED COURSES (from their dashboard):
${userContext.completedCourses.length > 0 
  ? userContext.completedCourses.map((c: any) => {
      const courseId = c.courseId || c.title || c;
      const grade = c.grade ? ` (Grade: ${c.grade})` : '';
      const semester = c.semester ? ` - ${c.semester}` : '';
      return `  • ${courseId}${grade}${semester}`;
    }).join('\n')
  : '  • No completed courses yet'}

CURRENT SCHEDULE (from their dashboard):
${userContext.currentSchedule.length > 0 
  ? userContext.currentSchedule.map((c: any) => {
      const courseId = c.courseId || c.title || c;
      const time = c.time ? ` at ${c.time}` : '';
      const days = c.days ? ` (${c.days})` : '';
      return `  • ${courseId}${time}${days}`;
    }).join('\n')
  : '  • No courses scheduled for current semester'}

GMU COURSE CATALOG:
- Total courses by subject: ${subjectSummaryText}
- Full catalog contains ${Object.values(subjectSummary).reduce((a, b) => a + b, 0)} courses across all subjects
- You can search for any course by code, subject, or keyword

CONTEXT FOR THIS QUERY:${contextSection}

PREREQUISITE VALIDATION:
- Student has completed: ${completedCourseCodes.join(', ') || 'none'}
- ALWAYS check prerequisites before recommending courses
- Validate against the student's completed courses list

INSTRUCTIONS:
- Be friendly, concise, and helpful - act as an academic advisor
- You have DIRECT ACCESS to the student's completed courses and schedule from their dashboard
- Reference their specific courses, grades, and progress when providing advice
- ALWAYS validate prerequisites against their completed courses before recommending new courses
- When suggesting courses, explicitly state:
  * Whether prerequisites are met
  * Which prerequisites are missing (if any)
  * What courses they need to take first
  * Why this course is beneficial (what it unlocks, career relevance, etc.)
- For course comparisons, provide advisor-style reasoning:
  * Pros and cons of taking the course
  * How it fits into their degree plan
  * Alternatives if they can't take it yet
  * Which course to prioritize and why
- Help with course planning, scheduling, and degree requirements
- Be specific and personalized - use their actual academic data
- Keep responses concise but informative
`;

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
        console.error('[chat-api] Error details:', JSON.stringify(error, null, 2));
        reply = getFallbackResponse(message, userContext, completedCourseCodes);
      }
    } else {
      // Fallback: Simple keyword-based responses (works without API key)
      reply = getFallbackResponse(message, userContext, completedCourseCodes);
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
function getFallbackResponse(
  message: string,
  userContext: {
    name: string;
    major: string;
    year: number;
    email: string;
    completedCourses: any[];
    currentSchedule: any[];
    creditsEarned: number;
    creditsInProgress: number;
    gpa: number;
  },
  completedCourseCodes: string[]
): string {
  const lower = message.toLowerCase();

  // Extract course codes (e.g., "CS 310", "ECE 232")
  const courseCodePattern = /\b([A-Z]{2,4})\s+(\d{3,4}[A-Z]?)\b/gi;
  const courseCodes: string[] = [];
  let match;
  while ((match = courseCodePattern.exec(message)) !== null) {
    courseCodes.push(`${match[1]} ${match[2]}`.toUpperCase());
  }

  // Handle profile/personal information questions
  if (lower.includes('my name') || lower.includes('who am i')) {
    return `You are ${userContext.name}, a ${userContext.major} student. Your email is ${userContext.email}.`;
  }

  if (lower.includes('my major') || lower.includes('what am i studying')) {
    return `You're studying ${userContext.major}. You're currently in year ${userContext.year}.`;
  }

  if (lower.includes('my gpa') || lower.includes('grade point')) {
    return `Your current GPA is ${userContext.gpa.toFixed(2)}. You have earned ${userContext.creditsEarned} credits with ${userContext.creditsInProgress} credits in progress.`;
  }

  if (lower.includes('what courses have i taken') || lower.includes('my courses') || 
      lower.includes('completed courses') || lower.includes('courses i took') ||
      lower.includes('classes i have taken') || lower.includes('what have i taken')) {
    if (userContext.completedCourses.length === 0) {
      return `You haven't added any completed courses yet. You can add them from your dashboard!`;
    }
    
    let response = `**Your Completed Courses:**\n\n`;
    userContext.completedCourses.forEach((course: any) => {
      const courseId = course.courseId || course.title || 'Unknown';
      const grade = course.grade ? ` - Grade: ${course.grade}` : '';
      const semester = course.semester ? ` (${course.semester})` : '';
      const credits = course.credits ? ` [${course.credits} credits]` : '';
      response += `• ${courseId}${grade}${semester}${credits}\n`;
    });
    response += `\n**Total Credits Earned:** ${userContext.creditsEarned}`;
    response += `\n**Current GPA:** ${userContext.gpa.toFixed(2)}`;
    return response;
  }

  if (lower.includes('can i take') && courseCodes.length > 0) {
    const courseCode = courseCodes[0];
    const course = getCourseByCode(courseCode);
    
    if (!course) {
      return `I couldn't find ${courseCode} in the GMU course catalog.`;
    }
    
    const canTake = canTakeCourse(courseCode, completedCourseCodes);
    const missing = getMissingPrerequisites(courseCode, completedCourseCodes);
    
    let response = `**${course.code}: ${course.title}**\n\n`;
    
    if (canTake) {
      response += `✅ **Yes, you can take this course!** You have completed all prerequisites.\n\n`;
    } else {
      response += `❌ **No, you cannot take this course yet.**\n\n`;
      response += `**Missing Prerequisites:**\n`;
      missing.forEach(prereq => {
        const prereqCourse = getCourseByCode(prereq);
        if (prereqCourse) {
          response += `• ${prereq}: ${prereqCourse.title}\n`;
        } else {
          response += `• ${prereq}\n`;
        }
      });
      response += `\nYou need to complete these courses first.`;
    }
    
    return response;
  }

  // Handle prerequisite questions
  if ((lower.includes('prerequisite') || lower.includes('prereq') || 
       lower.includes('need to take') || lower.includes('required for') ||
       lower.includes('what do i need')) && courseCodes.length > 0) {
    const courseCode = courseCodes[0];
    const course = getCourseByCode(courseCode);
    
    if (!course) {
      return `I couldn't find ${courseCode} in the GMU course catalog. Please check the course code and try again.`;
    }
    
    let response = `**${course.code}: ${course.title}**\n\n`;
    
    if (course.prerequisites && course.prerequisites.length > 0) {
      response += `**Prerequisites:**\n`;
      response += course.prerequisites.map(p => `• ${p}`).join('\n');
      response += `\n\n`;
      
      // Get prerequisite chain to show what they might need to take first
      const chain = getPrerequisiteChain(courseCode);
      if (chain.directPrerequisites.length > 0) {
        response += `**Direct Prerequisites Details:**\n`;
        chain.directPrerequisites.forEach(prereq => {
          response += `• **${prereq.code}**: ${prereq.title} (${prereq.credits} credits)\n`;
          if (prereq.prerequisites && prereq.prerequisites.length > 0) {
            response += `  Prerequisites: ${prereq.prerequisites.join(', ')}\n`;
          }
        });
      }
    } else {
      response += `**Prerequisites:** None! This course has no prerequisites.\n\n`;
    }
    
    response += `\n**Course Details:**\n`;
    response += `• Credits: ${course.credits}\n`;
    response += `• Description: ${course.description}`;
    
    return response;
  }

  // Handle course information questions
  if ((lower.includes('what is') || lower.includes('tell me about') || 
       lower.includes('info about') || lower.includes('about')) && courseCodes.length > 0) {
    const courseCode = courseCodes[0];
    const course = getCourseByCode(courseCode);
    
    if (!course) {
      return `I couldn't find ${courseCode} in the GMU course catalog. Please check the course code and try again.`;
    }
    
    let response = `**${course.code}: ${course.title}**\n\n`;
    response += `**Credits:** ${course.credits}\n\n`;
    response += `**Description:** ${course.description}\n\n`;
    
    if (course.prerequisites && course.prerequisites.length > 0) {
      response += `**Prerequisites:** ${course.prerequisites.join(', ')}\n\n`;
    } else {
      response += `**Prerequisites:** None\n\n`;
    }
    
    // Show what this course unlocks
    const chain = getPrerequisiteChain(courseCode);
    if (chain.unlockedCourses.length > 0) {
      response += `**This course unlocks:** ${chain.unlockedCourses.slice(0, 5).map(c => c.code).join(', ')}`;
      if (chain.unlockedCourses.length > 5) {
        response += ` and ${chain.unlockedCourses.length - 5} more courses`;
      }
    }
    
    return response;
  }

  // Search for courses by keyword
  if (lower.includes('course') || lower.includes('class')) {
    const relevantCourses = findRelevantCourses(message, []);
    if (relevantCourses.length > 0) {
      let response = `Here are some courses that might interest you:\n\n`;
      relevantCourses.slice(0, 5).forEach(course => {
        response += `**${course.code}: ${course.title}**\n`;
        response += `Credits: ${course.credits} | `;
        if (course.prerequisites && course.prerequisites.length > 0) {
          response += `Prerequisites: ${course.prerequisites.join(', ')}\n`;
        } else {
          response += `No prerequisites\n`;
        }
        response += `${course.description.substring(0, 150)}...\n\n`;
      });
      return response;
    }
  }

  // Basic intent detection for demo purposes
  if (lower.includes('hello') || lower.includes('hi')) {
    return `Hi ${userContext.name}! I'm your GMU academic advisor chatbot. I can help you with course information, prerequisites, and degree planning. You're currently studying ${userContext.major} with ${userContext.creditsEarned} credits earned. What would you like to know?`;
  }

  if (lower.includes('help')) {
    return `Hi ${userContext.name}! I can help you with:\n\n**Your Profile:**\n• "What's my name/major/GPA?"\n• "What courses have I taken?"\n• "Can I take CS 367?"\n\n**Course Information:**\n• "What do I need to take CS 367?"\n• "Tell me about MATH 125"\n• "Find computer science courses"\n\nJust ask me anything!`;
  }

  if (lower.includes('schedule') || lower.includes('calendar')) {
    return "I can help with course information! Once we integrate with Google Calendar, I'll be able to add courses directly to your calendar and check for conflicts.";
  }

  if (lower.includes('requirement') || lower.includes('degree')) {
    return "I can check your degree requirements! Once we have Degree Works integrated, I'll be able to show you exactly what you need to graduate.";
  }

  // Default response - still offer help but don't mention "demo mode"
  return `Hi ${userContext.name}! I can help you with:\n\n**Your Profile:**\n• "What courses have I taken?"\n• "What's my GPA?"\n• "Can I take CS 367?"\n\n**Course Info:**\n• "What do I need to take CS 367?"\n• "Tell me about MATH 125"\n\nWhat would you like to know?`;
}

