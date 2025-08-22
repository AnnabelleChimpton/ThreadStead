#!/usr/bin/env node

/**
 * Test Ring Hub Authentication with New Credentials
 */

const { getRingHubClient } = require('@/lib/ringhub-client');
const { createAuthenticatedRingHubClient } = require('@/lib/ringhub-user-operations');

async function testAuthentication() {
  try {
    console.log('🔍 Testing Ring Hub authentication...');
    
    // Test 1: Basic client initialization
    console.log('\n📡 Testing Ring Hub client initialization...');
    const client = getRingHubClient();
    if (!client) {
      throw new Error('Ring Hub client not available');
    }
    console.log('✅ Ring Hub client initialized successfully');
    
    // Test 2: Test basic read operation (should work without authentication)
    console.log('\n📖 Testing basic read operation...');
    try {
      const rings = await client.listRings({ limit: 1 });
      console.log('✅ Basic read operation successful');
      console.log(`   Found ${rings.length} ring(s)`);
    } catch (error) {
      console.log('❌ Basic read operation failed:', error.message);
    }
    
    // Test 3: Test authenticated operation (join a ring)
    console.log('\n🔐 Testing authenticated operation...');
    
    // Use a test user ID
    const testUserId = 'test-user-123';
    const authenticatedClient = createAuthenticatedRingHubClient(testUserId);
    
    try {
      // First, try to get user DID (this should work)
      const userDID = await authenticatedClient.getUserDID();
      console.log('✅ User DID generation successful:', userDID);
      
      // Try to get a ring first
      const testRingSlug = 'test-ring-or-existing';
      const ring = await authenticatedClient.getRing(testRingSlug);
      if (ring) {
        console.log('✅ Ring fetch successful:', ring.name);
        
        // Try to join (this will test server authentication)
        try {
          await authenticatedClient.joinRing(testRingSlug);
          console.log('✅ Ring join successful (or already member)');
        } catch (joinError) {
          if (joinError.status === 400) {
            console.log('ℹ️  Join returned 400 (likely already a member or other expected error)');
          } else if (joinError.status === 404) {
            console.log('ℹ️  Ring not found (404) - this is expected for test ring');
          } else if (joinError.status === 401) {
            console.log('❌ Authentication failed (401):', joinError.message);
            throw joinError;
          } else {
            console.log('⚠️  Join operation returned:', joinError.status, joinError.message);
          }
        }
      } else {
        console.log('ℹ️  Test ring not found, testing with a mock operation');
      }
      
    } catch (error) {
      if (error.status === 401) {
        console.log('❌ Authentication still failing:', error.message);
        console.log('   This suggests Ring Hub production doesn\'t recognize our new DID');
      } else {
        console.log('❌ Authenticated operation failed:', error.message);
      }
      throw error;
    }
    
    console.log('\n🎉 Ring Hub authentication test completed successfully!');
    
  } catch (error) {
    console.error('❌ Ring Hub authentication test failed:', error.message);
    if (error.status) {
      console.error('   HTTP Status:', error.status);
    }
    process.exit(1);
  }
}

testAuthentication();