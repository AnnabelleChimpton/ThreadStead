#!/usr/bin/env node

/**
 * Test Ring Hub with localhost DID
 */

// Set environment variables for localhost testing
process.env.NEXT_PUBLIC_USE_RING_HUB = 'true';
process.env.RING_HUB_URL = 'https://ringhub.io';
process.env.THREADSTEAD_DID = 'did:web:localhost%3A3000';
process.env.THREADSTEAD_PRIVATE_KEY_B64URL = 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g';
process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE = 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj';

const { RingHubClient } = require('@/lib/ringhub-client-fixed');

async function testWithLocalhostDID() {
  try {
    console.log('🔍 Testing Ring Hub with localhost DID...');
    console.log('   DID: did:web:localhost%3A3000');
    console.log('   Expected DID Document URL: http://localhost:3000/.well-known/did.json');
    
    // Test if Ring Hub accepts localhost DIDs
    const client = new RingHubClient({
      baseUrl: 'https://ringhub.io',
      instanceDID: 'did:web:localhost%3A3000',
      privateKeyBase64Url: 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g',
      publicKeyMultibase: 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj'
    });
    
    console.log('\n📋 Testing list rings with localhost DID...');
    const rings = await client.listRings({ limit: 1 });
    console.log('✅ List rings successful');
    
    if (rings.rings.length > 0) {
      const testRing = rings.rings[0];
      console.log(`\n🚀 Testing join with localhost DID for ring: ${testRing.slug}`);
      
      const testUserDID = 'did:key:localhost-test-' + Date.now();
      
      try {
        await client.joinRing(testRing.slug, testUserDID);
        console.log('✅ Join successful with localhost DID!');
      } catch (error) {
        console.log(`❌ Join failed: ${error.status} - ${error.message}`);
        
        if (error.status === 401) {
          console.log('   Ring Hub still can\'t verify localhost DID');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Localhost DID test failed:', error.message);
  }
}

testWithLocalhostDID();