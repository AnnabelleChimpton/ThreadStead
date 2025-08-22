#!/usr/bin/env node

/**
 * Test Fixed Ring Hub Client
 */

// Set environment variables for testing
process.env.NEXT_PUBLIC_USE_RING_HUB = 'true';
process.env.RING_HUB_URL = 'https://ringhub.io';
process.env.THREADSTEAD_DID = 'did:web:homepageagain.com';
process.env.THREADSTEAD_PRIVATE_KEY_B64URL = 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g';
process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE = 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj';

const { RingHubClient } = require('@/lib/ringhub-client-fixed');

async function testFixedClient() {
  try {
    console.log('🔍 Testing Fixed Ring Hub Client...');
    
    // Test 1: Client initialization
    console.log('\n📡 Testing client initialization...');
    const client = RingHubClient.fromEnvironment();
    if (!client) {
      throw new Error('Failed to create Ring Hub client from environment');
    }
    console.log('✅ Ring Hub client initialized successfully');
    
    // Test 2: List rings (GET - should work without signature)
    console.log('\n📋 Testing list rings (GET)...');
    const ringResponse = await client.listRings({ limit: 3 });
    console.log('✅ List rings successful');
    console.log(`   Found ${ringResponse.rings.length} rings`);
    
    for (const ring of ringResponse.rings) {
      console.log(`   - ${ring.slug}: ${ring.name} (${ring.joinPolicy || ring.joinType})`);
    }
    
    // Test 3: Join ring (POST - should work with signature)
    if (ringResponse.rings.length > 0) {
      console.log('\n🚀 Testing join ring (POST)...');
      
      // Find an open ring
      const openRing = ringResponse.rings.find(r => 
        r.joinPolicy === 'OPEN' || r.joinType === 'open'
      ) || ringResponse.rings[0];
      
      console.log(`   Attempting to join: ${openRing.slug}`);
      
      // Create a test user DID
      const testUserDID = 'did:key:test-' + Date.now();
      
      try {
        const membership = await client.joinRing(openRing.slug, testUserDID);
        console.log('✅ Join ring successful!');
        console.log('   Membership:', membership);
        
        // Test leaving the ring
        console.log('\n👋 Testing leave ring (POST)...');
        await client.leaveRing(openRing.slug, testUserDID);
        console.log('✅ Leave ring successful!');
        
      } catch (joinError) {
        if (joinError.status === 400) {
          console.log('ℹ️  Join returned 400:', joinError.message);
          console.log('   This might be expected (validation error, etc.)');
        } else if (joinError.status === 401) {
          console.log('❌ Authentication failed (401):', joinError.message);
          console.log('   The fixed client still has authentication issues');
          throw joinError;
        } else if (joinError.status === 403) {
          console.log('ℹ️  Join forbidden (403):', joinError.message);
          console.log('   This might be expected (permissions, etc.)');
        } else {
          console.log('⚠️  Join failed with status:', joinError.status, joinError.message);
        }
      }
    }
    
    console.log('\n🎉 Fixed Ring Hub client test completed!');
    
  } catch (error) {
    console.error('❌ Fixed Ring Hub client test failed:', error.message);
    if (error.status) {
      console.error('   HTTP Status:', error.status);
    }
    throw error;
  }
}

testFixedClient().catch(console.error);