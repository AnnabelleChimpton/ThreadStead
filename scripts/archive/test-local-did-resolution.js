#!/usr/bin/env node

/**
 * Test local DID resolution and alternative testing approaches
 */

// Set environment variables for testing
process.env.NEXT_PUBLIC_USE_RING_HUB = 'true';
process.env.RING_HUB_URL = 'https://ringhub.io';
process.env.THREADSTEAD_DID = 'did:web:homepageagain.com';
process.env.THREADSTEAD_PRIVATE_KEY_B64URL = 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g';
process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE = 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj';

const { generateDIDDocument } = require('@/lib/server-did-client');

async function testAlternatives() {
  try {
    console.log('🔍 Testing alternative approaches for Ring Hub authentication...');
    
    // Option 1: Check if we can use localhost DID for testing
    console.log('\n1️⃣  Testing with localhost DID...');
    
    // Try did:web:localhost%3A3000 format
    const localhostDID = 'did:web:localhost%3A3000';
    console.log(`   Localhost DID: ${localhostDID}`);
    console.log('   DID Document URL: http://localhost:3000/.well-known/did.json');
    
    // Option 2: Check Ring Hub's development/staging environment
    console.log('\n2️⃣  Checking for Ring Hub development endpoints...');
    
    // Common staging URLs to try
    const stagingUrls = [
      'https://staging.ringhub.io',
      'https://dev.ringhub.io', 
      'https://test.ringhub.io',
      'http://localhost:3100' // Based on logs showing localhost:3100 DIDs
    ];
    
    for (const url of stagingUrls) {
      try {
        console.log(`   Trying ${url}/health...`);
        const response = await fetch(`${url}/health`, { 
          method: 'GET',
          timeout: 3000 
        });
        if (response.ok) {
          console.log(`   ✅ ${url} is accessible!`);
          const data = await response.text();
          console.log(`   Response: ${data.slice(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ❌ ${url} not accessible`);
      }
    }
    
    // Option 3: Test with ngrok or similar tunnel
    console.log('\n3️⃣  Ngrok tunnel option...');
    console.log('   You could use ngrok to expose localhost:3000 to the internet:');
    console.log('   1. Install ngrok: npm install -g ngrok');
    console.log('   2. Start ThreadStead: npm run dev');
    console.log('   3. In another terminal: ngrok http 3000');
    console.log('   4. Update THREADSTEAD_DID to use ngrok URL');
    console.log('   Example: did:web:abc123.ngrok.io');
    
    // Option 4: Generate our DID document content for manual verification
    console.log('\n4️⃣  DID Document content for manual verification...');
    const didDoc = await generateDIDDocument();
    console.log('   Generated DID Document:');
    console.log(JSON.stringify(didDoc, null, 2));
    
    // Option 5: Check if Ring Hub has a test mode
    console.log('\n5️⃣  Ring Hub test mode investigation...');
    console.log('   From the Ring Hub logs, we saw DIDs like:');
    console.log('   - did:web:localhost:3100:actors:alice');
    console.log('   - did:web:localhost:3100:actors:bob');
    console.log('   This suggests Ring Hub might have a localhost development mode');
    
    // Option 6: Direct signature verification
    console.log('\n6️⃣  Manual signature verification...');
    console.log('   We can verify our signature generation is correct:');
    
    const crypto = require('crypto');
    const testMessage = 'test message for verification';
    
    // Load our private key
    const privateKeyB64 = 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g';
    const privateKeyBytes = Buffer.from(privateKeyB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    // Create PKCS#8 format
    const pkcs8Header = Buffer.from([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
    ]);
    const pkcs8Key = Buffer.concat([pkcs8Header, privateKeyBytes]);
    const privateKey = crypto.createPrivateKey({ key: pkcs8Key, format: 'der', type: 'pkcs8' });
    
    const signature = crypto.sign(null, Buffer.from(testMessage), privateKey);
    console.log(`   ✅ Signature generation works: ${signature.toString('base64').slice(0, 20)}...`);
    
    console.log('\n💡 Recommendation: Try using ngrok tunnel for testing');
    console.log('   This will make your localhost accessible to Ring Hub for DID verification');
    
  } catch (error) {
    console.error('❌ Alternative testing failed:', error.message);
  }
}

testAlternatives();