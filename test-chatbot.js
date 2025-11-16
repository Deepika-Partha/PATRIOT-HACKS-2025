/**
 * Simple test script for the chatbot endpoint
 * Run with: node test-chatbot.js
 */

const TEST_MESSAGES = [
  'Hello!',
  'What classes should I take?',
  'Can you help me with my schedule?',
  'What requirements do I have left?',
];

async function testChatbot() {
  console.log('\n🤖 Testing GMU Chatbot Endpoint\n');
  console.log('Make sure dev server is running: npm run dev\n');

  const baseUrl = 'http://localhost:5173'; // Default SvelteKit port

  // Check if server is running
  try {
    await fetch(baseUrl);
  } catch (error) {
    console.error('❌ Cannot connect to ' + baseUrl);
    console.error('Make sure your SvelteKit dev server is running: npm run dev');
    console.error('Note: The port might be different. Check your terminal output.\n');
    process.exit(1);
  }

  console.log('='.repeat(60));
  
  let conversationHistory = [];

  for (const message of TEST_MESSAGES) {
    console.log(`\n💬 You: "${message}"`);
    
    try {
      const response = await fetch(`${baseUrl}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          conversationHistory 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error: ${response.status} ${response.statusText}`);
        console.log(`Response: ${errorText}`);
        continue;
      }

      const data = await response.json();
      console.log(`🤖 Bot: ${data.reply}`);
      
      // Update conversation history
      if (data.conversationHistory) {
        conversationHistory = data.conversationHistory;
      }
      
    } catch (error) {
      console.error('❌ Request failed:', error.message);
    }

    console.log('-'.repeat(60));
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n✅ Chatbot test complete!\n');
}

testChatbot().catch(console.error);

