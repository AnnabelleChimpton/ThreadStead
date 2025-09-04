#!/usr/bin/env npx tsx

/**
 * Test User did:web System
 * 
 * Tests the new user DID generation and publishing system
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getOrCreateUserDID, generateUserDIDDocument, getUserDIDMappingByHash } from '@/lib/server-did-client'

async function testUserDIDSystem() {
  console.log('🧪 Testing User did:web System')
  console.log('==============================')

  // Test 1: Create user DID
  console.log('\n1️⃣ Testing User DID Generation...')
  const testUserId = 'test-user-123'
  
  try {
    const userDIDMapping = await getOrCreateUserDID(testUserId)
    console.log(`   ✅ User DID created: ${userDIDMapping.did}`)
    console.log(`   ✅ User hash: ${userDIDMapping.userHash}`)
    console.log(`   ✅ Created: ${userDIDMapping.created}`)
    
    // Test 2: Generate DID Document
    console.log('\n2️⃣ Testing DID Document Generation...')
    const didDocument = generateUserDIDDocument(userDIDMapping)
    console.log(`   ✅ DID Document generated`)
    console.log(`   📄 DID: ${didDocument.id}`)
    console.log(`   🔑 Verification Method ID: ${didDocument.verificationMethod[0].id}`)
    
    // Test 3: Test Hash Lookup
    console.log('\n3️⃣ Testing Hash-Based Lookup...')
    const foundMapping = await getUserDIDMappingByHash(userDIDMapping.userHash)
    if (foundMapping) {
      console.log(`   ✅ Hash lookup successful: ${foundMapping.did}`)
    } else {
      console.log(`   ❌ Hash lookup failed`)
    }
    
    // Test 4: Display URLs
    console.log('\n4️⃣ Testing DID Resolution URLs...')
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const didDocUrl = `${baseUrl}/users/${userDIDMapping.userHash}/did.json`
    const directoryUrl = `${baseUrl}/users`
    
    console.log(`   📍 DID Document URL: ${didDocUrl}`)
    console.log(`   📍 User Directory: ${directoryUrl}`)
    
    // Test 5: DID Format Verification
    console.log('\n5️⃣ Testing DID Format...')
    const domain = process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, '') || 'localhost:3000'
    const expectedFormat = `did:web:${domain}:users:${userDIDMapping.userHash}`
    
    if (userDIDMapping.did === expectedFormat) {
      console.log(`   ✅ DID format correct: ${userDIDMapping.did}`)
    } else {
      console.log(`   ❌ DID format incorrect`)
      console.log(`   Expected: ${expectedFormat}`)
      console.log(`   Actual: ${userDIDMapping.did}`)
    }
    
    console.log('\n✅ User did:web System Test Complete!')
    console.log('\n📋 Summary:')
    console.log(`   User ID: ${testUserId}`)
    console.log(`   User DID: ${userDIDMapping.did}`)  
    console.log(`   Hash: ${userDIDMapping.userHash}`)
    console.log(`   DID Document: ${didDocUrl}`)
    
    console.log('\n🧪 Next Steps:')
    console.log('   1. Start your development server')
    console.log(`   2. Visit ${didDocUrl} to see the DID document`)
    console.log(`   3. Visit ${directoryUrl} to see all user DIDs`)
    console.log('   4. Test joining a ring with the new user DID system')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

async function main() {
  await testUserDIDSystem()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})