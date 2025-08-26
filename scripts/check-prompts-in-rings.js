/**
 * Check for prompts in all rings the server DID is a member of
 */

const fetch = require('node-fetch');
require('dotenv').config();

async function checkPromptsInRings() {
  // Rings from the server DID memberships we saw in the logs
  const rings = [
    'the-spool-fork-1',
    'the-spool-fork-fork',
    'the-spool-fork-fork-fork',
    'the-spool-fork-fork-fork-2',
    'stinky-fork-fork2' // Also check this one explicitly
  ];

  console.log('Checking for prompts in rings...\n');

  for (const ring of rings) {
    try {
      const response = await fetch(`https://ringhub.io/trp/rings/${ring}/feed?limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const prompts = data.posts?.filter(p => p.metadata?.type === 'threadring_prompt') || [];
        
        if (prompts.length > 0) {
          console.log(`📍 Ring: ${ring}`);
          console.log(`   Found ${prompts.length} prompt(s):`);
          prompts.forEach(p => {
            const meta = p.metadata?.prompt || {};
            console.log(`   - ID: ${meta.promptId}`);
            console.log(`     Title: ${meta.title}`);
            console.log(`     Active: ${meta.isActive}`);
          });
          console.log('');
        }
      }
    } catch (error) {
      // Silent fail for rings that don't exist
    }
  }
  
  console.log('Done checking rings.');
}

checkPromptsInRings();