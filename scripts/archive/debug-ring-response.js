#!/usr/bin/env node

/**
 * Debug Ring Hub Response Format
 */

// Set environment variables for testing
process.env.NEXT_PUBLIC_USE_RING_HUB = 'true';
process.env.RING_HUB_URL = 'https://ringhub.io';
process.env.THREADSTEAD_DID = 'did:web:homepageagain.com';

const { getRingHubClient } = require('@/lib/api/ringhub/ringhub-client');

async function debugResponse() {
  try {
    console.log('🔍 Debugging Ring Hub response format...');
    
    const client = getRingHubClient();
    if (!client) {
      throw new Error('Ring Hub client not available');
    }
    
    console.log('\n📋 Raw response from listRings:');
    const response = await client.listRings({ limit: 5 });
    console.log('Response type:', typeof response);
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (response && typeof response === 'object') {
      console.log('\nResponse keys:', Object.keys(response));
      
      if (response.rings || response.data || response.results) {
        console.log('Likely contains rings data');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.status) {
      console.error('   HTTP Status:', error.status);
    }
  }
}

debugResponse();