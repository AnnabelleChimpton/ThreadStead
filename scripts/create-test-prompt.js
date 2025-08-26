/**
 * Script to create a test prompt in Ring Hub
 * Usage: node scripts/create-test-prompt.js
 */

require('dotenv').config();

async function createTestPrompt() {
  const ringSlug = 'stinky-fork-fork2';
  const promptData = {
    title: "What's cluckin' today?",
    description: "Share what's happening in your day - big or small, serious or silly!",
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    isActive: true,
    isPinned: false
  };

  try {
    // Make API call to create prompt
    const response = await fetch(`http://localhost:3000/api/threadrings/${ringSlug}/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add authentication headers here
        // 'Cookie': 'your-session-cookie'
      },
      body: JSON.stringify(promptData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create prompt: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Prompt created successfully!');
    console.log('Prompt ID:', result.id);
    console.log('Prompt Title:', result.title);
    console.log('\n📝 Use this URL to respond to the prompt:');
    console.log(`http://localhost:3000/post/new?promptId=${result.id}&threadRing=${ringSlug}&promptTitle=${encodeURIComponent(result.title)}`);

  } catch (error) {
    console.error('❌ Error creating prompt:', error);
  }
}

// Note: This script won't work without proper authentication
console.log('⚠️  This script requires authentication to work.');
console.log('You need to:');
console.log('1. Be logged in to ThreadStead');
console.log('2. Copy your session cookie from the browser');
console.log('3. Add it to the request headers in this script');
console.log('\nAlternatively, create a prompt through the UI if available.');

// Uncomment and run after adding authentication
// createTestPrompt();