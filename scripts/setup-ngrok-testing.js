#!/usr/bin/env node

/**
 * Setup script for testing Ring Hub with ngrok tunnel
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ngrok testing for Ring Hub authentication...');

console.log('\n📋 Instructions for ngrok testing:');
console.log('1. Start your ThreadStead server: npm run dev');
console.log('2. In a new terminal, run: ngrok http 3000');
console.log('3. Copy the https ngrok URL (e.g., https://abc123.ngrok.io)');
console.log('4. Run this script with the ngrok URL as an argument');
console.log('   Example: node scripts/setup-ngrok-testing.js https://abc123.ngrok.io');

const ngrokUrl = process.argv[2];

if (!ngrokUrl) {
  console.log('\n⚠️  Please provide the ngrok URL as an argument');
  console.log('   Example: node scripts/setup-ngrok-testing.js https://abc123.ngrok.io');
  process.exit(1);
}

if (!ngrokUrl.startsWith('https://') || !ngrokUrl.includes('.ngrok.io')) {
  console.log('\n❌ Invalid ngrok URL. Please provide a valid https ngrok URL');
  console.log('   Example: https://abc123.ngrok.io');
  process.exit(1);
}

console.log(`\n🔧 Configuring ThreadStead for ngrok URL: ${ngrokUrl}`);

// Extract domain from ngrok URL
const domain = ngrokUrl.replace('https://', '');
const ngrokDID = `did:web:${domain}`;

console.log(`   DID: ${ngrokDID}`);
console.log(`   DID Document URL: ${ngrokUrl}/.well-known/did.json`);

// Create test script with ngrok configuration
const testScript = `#!/usr/bin/env node

/**
 * Test Ring Hub with ngrok tunnel
 * Generated automatically by setup-ngrok-testing.js
 */

// Set environment variables for ngrok testing
process.env.NEXT_PUBLIC_USE_RING_HUB = 'true';
process.env.RING_HUB_URL = 'https://ringhub.io';
process.env.THREADSTEAD_DID = '${ngrokDID}';
process.env.THREADSTEAD_PRIVATE_KEY_B64URL = 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g';
process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE = 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj';

const { RingHubClient } = require('@/lib/ringhub-client-fixed');
const fetch = require('node-fetch');

async function testWithNgrok() {
  try {
    console.log('🔍 Testing Ring Hub with ngrok tunnel...');
    console.log('   Ngrok URL: ${ngrokUrl}');
    console.log('   DID: ${ngrokDID}');
    
    // First verify DID document is accessible
    console.log('\\n🔍 Verifying DID document accessibility...');
    try {
      const didResponse = await fetch('${ngrokUrl}/.well-known/did.json');
      if (didResponse.ok) {
        const didDoc = await didResponse.json();
        console.log('✅ DID document accessible via ngrok');
        console.log('   Public key multibase:', didDoc.verificationMethod[0].publicKeyMultibase);
      } else {
        throw new Error(\`DID document not accessible: \${didResponse.status}\`);
      }
    } catch (didError) {
      console.log('❌ DID document not accessible:', didError.message);
      console.log('   Make sure ThreadStead is running on localhost:3000');
      return;
    }
    
    // Test Ring Hub authentication
    const client = new RingHubClient({
      baseUrl: 'https://ringhub.io',
      instanceDID: '${ngrokDID}',
      privateKeyBase64Url: 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g',
      publicKeyMultibase: 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj'
    });
    
    console.log('\\n📋 Testing list rings...');
    const rings = await client.listRings({ limit: 3 });
    console.log('✅ List rings successful');
    
    if (rings.rings.length > 0) {
      const openRing = rings.rings.find(r => r.joinPolicy === 'OPEN' || r.joinType === 'open') || rings.rings[0];
      
      console.log(\`\\n🚀 Testing join ring: \${openRing.slug}\`);
      const testUserDID = 'did:key:ngrok-test-' + Date.now();
      
      try {
        const membership = await client.joinRing(openRing.slug, testUserDID);
        console.log('🎉 SUCCESS! Ring Hub authentication working with ngrok!');
        console.log('   Membership:', membership);
        
        // Test leaving
        console.log('\\n👋 Testing leave ring...');
        await client.leaveRing(openRing.slug, testUserDID);
        console.log('✅ Leave ring successful!');
        
        console.log('\\n✨ Ring Hub authentication is now working!');
        console.log('   You can now proceed with ThreadStead Ring Hub integration');
        
      } catch (joinError) {
        if (joinError.status === 401) {
          console.log('❌ Still getting 401 - Authentication required');
          console.log('   This might indicate an issue with DID verification or signature generation');
        } else {
          console.log(\`⚠️  Join failed with: \${joinError.status} - \${joinError.message}\`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ngrok test failed:', error.message);
  }
}

testWithNgrok();
`;

// Write the test script
const testScriptPath = path.join(__dirname, 'test-ngrok-ringhub.js');
fs.writeFileSync(testScriptPath, testScript);

console.log(`\n✅ Generated ngrok test script: ${testScriptPath}`);
console.log('\n🚀 Next steps:');
console.log('1. Make sure ThreadStead is running: npm run dev');
console.log('2. Make sure ngrok tunnel is active');
console.log(`3. Run the test: node scripts/test-ngrok-ringhub.js`);

console.log('\n💡 If the test passes, you can update your .env file:');
console.log(`THREADSTEAD_DID="${ngrokDID}"`);
console.log('\nThen all Ring Hub operations should work with the ngrok tunnel!');