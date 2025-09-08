#!/usr/bin/env node

/**
 * Test DID document generation
 */

const { generateDIDDocument, initializeServerDID } = require('@/lib/api/did/server-did-client');

async function test() {
  try {
    console.log('🔍 Testing DID document generation...');
    
    // Initialize server DID
    const init = await initializeServerDID();
    console.log('✅ Server DID initialized:', init.did);
    
    // Generate DID document
    const didDocument = await generateDIDDocument();
    console.log('✅ DID document generated successfully:');
    console.log(JSON.stringify(didDocument, null, 2));
    
    // Verify the multibase key
    const verificationMethod = didDocument.verificationMethod[0];
    console.log('\n🔑 Public key multibase:', verificationMethod.publicKeyMultibase);
    console.log('Expected:', 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj');
    console.log('Match:', verificationMethod.publicKeyMultibase === 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj' ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();