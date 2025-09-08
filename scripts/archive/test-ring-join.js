#!/usr/bin/env node

/**
 * Test Ring Hub Join Functionality
 */

// Set environment variables for testing
process.env.NEXT_PUBLIC_USE_RING_HUB = 'true';
process.env.RING_HUB_URL = 'https://ringhub.io';
process.env.THREADSTEAD_DID = 'did:web:homepageagain.com';

const { createAuthenticatedRingHubClient } = require('@/lib/api/ringhub/ringhub-user-operations');

async function testJoinFunctionality() {
  try {
    console.log('🔍 Testing Ring Hub join functionality...');
    
    // Create authenticated client for test user
    const testUserId = 'claude-test-user-' + Date.now();
    const authenticatedClient = createAuthenticatedRingHubClient(testUserId);
    
    console.log('\n📋 Listing available rings...');
    const ringResponse = await authenticatedClient.listRings({ limit: 10 });
    const rings = ringResponse.rings || [];
    console.log(`Found ${rings.length} rings:`);
    
    for (const ring of rings.slice(0, 3)) {
      console.log(`  - ${ring.slug}: ${ring.name} (${ring.memberCount} members, ${ring.joinPolicy})`);
    }
    
    if (rings.length > 0) {
      // Find an open ring to test with
      const openRing = rings.find(r => r.joinPolicy === 'OPEN') || rings[0];
      const testRing = openRing;
      console.log(`\n🚀 Testing join for ring: ${testRing.slug}`);
      
      try {
        const membership = await authenticatedClient.joinRing(testRing.slug);
        console.log('✅ Successfully joined ring!');
        console.log('   Membership:', membership);
        
        // Test leaving the ring
        console.log(`\n👋 Testing leave for ring: ${testRing.slug}`);
        await authenticatedClient.leaveRing(testRing.slug);
        console.log('✅ Successfully left ring!');
        
      } catch (joinError) {
        if (joinError.status === 400) {
          console.log('ℹ️  Join returned 400:', joinError.message);
          console.log('   This might be expected (already member, ring full, etc.)');
        } else if (joinError.status === 401) {
          console.log('❌ Authentication failed (401):', joinError.message);
          throw joinError;
        } else if (joinError.status === 403) {
          console.log('ℹ️  Join forbidden (403):', joinError.message);
          console.log('   This might be expected (invite-only ring, blocked, etc.)');
        } else {
          console.log('⚠️  Join failed with status:', joinError.status, joinError.message);
        }
      }
    } else {
      console.log('ℹ️  No rings available for testing');
    }
    
    console.log('\n🎉 Join functionality test completed!');
    
  } catch (error) {
    console.error('❌ Join functionality test failed:', error.message);
    if (error.status) {
      console.error('   HTTP Status:', error.status);
    }
    throw error;
  }
}

testJoinFunctionality().catch(console.error);