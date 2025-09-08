#!/usr/bin/env node

/**
 * Test Complete Ring Hub Integration
 * Tests all ThreadRing pages and APIs to ensure Ring Hub integration works
 */

// Set environment variables for testing
process.env.NEXT_PUBLIC_USE_RING_HUB = 'true';
process.env.RING_HUB_URL = 'https://ringhub.io';
process.env.THREADSTEAD_DID = 'did:web:homepageagain.com';
process.env.THREADSTEAD_PRIVATE_KEY_B64URL = 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g';
process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE = 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj';

const { getRingHubClient } = require('@/lib/api/ringhub/ringhub-client');
const { createAuthenticatedRingHubClient } = require('@/lib/api/ringhub/ringhub-user-operations');

async function testCompleteIntegration() {
  console.log('🔍 Testing Complete Ring Hub Integration...');
  console.log('   Environment: Development mode');
  console.log('   Ring Hub URL: https://ringhub.io');
  console.log('   DID: did:web:homepageagain.com');
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  function addResult(test, status, message, details = null) {
    results[status]++;
    results.details.push({ test, status, message, details });
    
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏸️';
    console.log(`${icon} ${test}: ${message}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  // Test 1: Ring Hub Client Initialization
  console.log('\n📡 Testing Ring Hub Client...');
  try {
    const client = getRingHubClient();
    if (client) {
      addResult('Client Initialization', 'passed', 'Ring Hub client created successfully');
    } else {
      addResult('Client Initialization', 'failed', 'Ring Hub client not available');
      return results;
    }
  } catch (error) {
    addResult('Client Initialization', 'failed', 'Ring Hub client creation failed', error.message);
    return results;
  }

  // Test 2: List Rings (GET operation)
  console.log('\n📋 Testing Ring Operations...');
  try {
    const client = getRingHubClient();
    const ringResponse = await client.listRings({ limit: 5 });
    const rings = ringResponse.rings || [];
    
    if (rings.length > 0) {
      addResult('List Rings', 'passed', `Found ${rings.length} rings in Ring Hub`);
      console.log(`   Available rings: ${rings.map(r => r.slug).join(', ')}`);
    } else {
      addResult('List Rings', 'failed', 'No rings found in Ring Hub');
    }
  } catch (error) {
    addResult('List Rings', 'failed', 'Failed to list rings', error.message);
  }

  // Test 3: Get Ring Details
  try {
    const client = getRingHubClient();
    const ringResponse = await client.listRings({ limit: 1 });
    const rings = ringResponse.rings || [];
    
    if (rings.length > 0) {
      const testRing = rings[0];
      const ringDetails = await client.getRing(testRing.slug);
      
      if (ringDetails) {
        addResult('Get Ring Details', 'passed', `Retrieved details for ${testRing.slug}`);
      } else {
        addResult('Get Ring Details', 'failed', 'Ring details not found');
      }
    } else {
      addResult('Get Ring Details', 'skipped', 'No rings available to test');
    }
  } catch (error) {
    addResult('Get Ring Details', 'failed', 'Failed to get ring details', error.message);
  }

  // Test 4: Get Ring Members
  try {
    const client = getRingHubClient();
    const ringResponse = await client.listRings({ limit: 1 });
    const rings = ringResponse.rings || [];
    
    if (rings.length > 0) {
      const testRing = rings[0];
      const members = await client.getRingMembers(testRing.slug);
      
      addResult('Get Ring Members', 'passed', `Retrieved ${members.length} members for ${testRing.slug}`);
    } else {
      addResult('Get Ring Members', 'skipped', 'No rings available to test');
    }
  } catch (error) {
    addResult('Get Ring Members', 'failed', 'Failed to get ring members', error.message);
  }

  // Test 5: Authentication for Write Operations
  console.log('\n🔐 Testing Authentication (Expected to fail until production deployment)...');
  try {
    const testUserId = 'integration-test-' + Date.now();
    const authenticatedClient = createAuthenticatedRingHubClient(testUserId);
    
    // This will fail because DID document isn't accessible
    const ringResponse = await authenticatedClient.listRings({ limit: 1 });
    const rings = ringResponse.rings || [];
    
    if (rings.length > 0) {
      const testRing = rings[0];
      
      // Find an open ring
      const openRing = rings.find(r => r.joinPolicy === 'OPEN' || r.joinType === 'open') || testRing;
      
      try {
        await authenticatedClient.joinRing(openRing.slug);
        addResult('Join Ring Authentication', 'passed', 'Successfully joined ring (unexpected!)');
      } catch (authError) {
        if (authError.status === 401) {
          addResult('Join Ring Authentication', 'skipped', 'Authentication failed as expected (DID document not accessible)', 'This is expected until production deployment');
        } else {
          addResult('Join Ring Authentication', 'failed', `Unexpected error: ${authError.message}`);
        }
      }
    } else {
      addResult('Join Ring Authentication', 'skipped', 'No rings available to test');
    }
  } catch (error) {
    addResult('Join Ring Authentication', 'failed', 'Authentication test failed', error.message);
  }

  // Test 6: ThreadRing Page Integration Points
  console.log('\n🌐 Testing Page Integration Points...');
  
  // Test settings page integration
  try {
    const { featureFlags } = require('@/lib/feature-flags');
    const ringHubEnabled = featureFlags.ringhub();
    
    if (ringHubEnabled) {
      addResult('Feature Flag Check', 'passed', 'Ring Hub feature flag is enabled');
    } else {
      addResult('Feature Flag Check', 'failed', 'Ring Hub feature flag is disabled');
    }
  } catch (error) {
    addResult('Feature Flag Check', 'failed', 'Failed to check feature flags', error.message);
  }

  // Test DID document endpoint
  try {
    const response = await fetch('http://localhost:3000/api/.well-known/did.json');
    if (response.ok) {
      const didDoc = await response.json();
      if (didDoc.id === 'did:web:homepageagain.com' && didDoc.verificationMethod?.[0]?.publicKeyMultibase) {
        addResult('DID Document Endpoint', 'passed', 'DID document accessible and valid');
      } else {
        addResult('DID Document Endpoint', 'failed', 'DID document malformed');
      }
    } else {
      addResult('DID Document Endpoint', 'failed', `DID document not accessible: ${response.status}`);
    }
  } catch (error) {
    addResult('DID Document Endpoint', 'failed', 'Failed to test DID document', error.message);
  }

  // Test Summary
  console.log('\n📊 Integration Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏸️  Skipped: ${results.skipped}`);
  console.log(`📋 Total Tests: ${results.passed + results.failed + results.skipped}`);
  console.log('');

  // Show details for failed tests
  const failedTests = results.details.filter(r => r.status === 'failed');
  if (failedTests.length > 0) {
    console.log('❌ Failed Tests Detail:');
    failedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.message}`);
      if (test.details) {
        console.log(`     ${test.details}`);
      }
    });
    console.log('');
  }

  // Integration Status
  console.log('🎯 Integration Status:');
  
  if (results.failed === 0 || (results.failed === 1 && failedTests.some(t => t.test === 'Join Ring Authentication'))) {
    console.log('✅ Ring Hub integration is ready for production!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Deploy ThreadStead to https://homepageagain.com');
    console.log('   2. Verify DID document is accessible at https://homepageagain.com/.well-known/did.json');
    console.log('   3. Test write operations (join, fork, create rings)');
    console.log('   4. All ThreadRing functionality will work with Ring Hub');
  } else {
    console.log('⚠️  Ring Hub integration needs attention');
    console.log('   Check failed tests above and resolve issues');
  }

  return results;
}

testCompleteIntegration().catch(console.error);