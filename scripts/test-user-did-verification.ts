#!/usr/bin/env npx tsx

/**
 * Test User DID Verification with Ring Hub
 * 
 * Tests if user DIDs can authenticate with Ring Hub for operations
 * This is different from server DID verification - tests individual user authentication
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getOrCreateUserDID, generateUserDIDDocument } from '@/lib/server-did-client'
import { RingHubClient } from '@/lib/ringhub-client'

async function testUserDIDVerification() {
  console.log('🔍 Testing User DID Verification with Ring Hub')
  console.log('==============================================')
  
  const testUserId = 'test-user-verification-123'

  // Step 1: Create/get user DID
  console.log('\n1️⃣ Creating User DID...')
  try {
    const userDIDMapping = await getOrCreateUserDID(testUserId)
    console.log(`   ✅ User DID: ${userDIDMapping.did}`)
    console.log(`   🔑 Public Key: ${userDIDMapping.publicKey.slice(0, 20)}...`)
    console.log(`   📍 Hash: ${userDIDMapping.userHash}`)
    
    // Step 2: Check DID document accessibility  
    console.log('\n2️⃣ Testing DID Document Accessibility...')
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const didDocUrl = `${baseUrl}/api/users/${userDIDMapping.userHash}/did.json`
    console.log(`   📄 DID Document URL: ${didDocUrl}`)
    
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    if (isLocalhost) {
      console.log(`   ⚠️ Using localhost - Ring Hub cannot resolve this URL externally`)
      console.log(`   💡 In development: Ring Hub will reject this DID`)
      console.log(`   🏗️ In production: Use a real domain for DID resolution`)
    } else {
      console.log(`   ✅ Production domain - Ring Hub can resolve this DID`)
    }

    // Step 3: Generate DID document
    console.log('\n3️⃣ Generating DID Document...')
    const didDocument = generateUserDIDDocument(userDIDMapping)
    console.log(`   ✅ DID Document generated`)
    console.log(`   🆔 ID: ${didDocument.id}`)
    console.log(`   🔐 Key ID: ${didDocument.verificationMethod[0].id}`)

    // Step 4: Test Ring Hub client creation
    console.log('\n4️⃣ Testing Ring Hub Client Creation...')
    try {
      const userClient = new RingHubClient({
        baseUrl: process.env.RING_HUB_URL!,
        instanceDID: userDIDMapping.did,
        privateKeyBase64Url: userDIDMapping.secretKey,
        publicKeyMultibase: userDIDMapping.publicKey
      })
      console.log(`   ✅ User Ring Hub client created successfully`)
      
      // Step 5: Test authentication with a simple read operation
      console.log('\n5️⃣ Testing Ring Hub Authentication...')
      
      if (isLocalhost) {
        console.log(`   ⚠️ Skipping authentication test - localhost DID won't work with Ring Hub`)
        console.log(`   💡 Expected result: 401 Authentication required (DID not resolvable)`)
      } else {
        try {
          console.log(`   🔄 Attempting to list rings with user DID...`)
          const result = await userClient.listRings({ limit: 1 })
          console.log(`   ✅ User DID authentication successful!`)
          console.log(`   📋 User can access Ring Hub with their own DID`)
          console.log(`   📊 Available rings: ${result.total}`)
        } catch (authError) {
          console.log(`   ❌ User DID authentication failed`)
          console.log(`   🔍 Error: ${authError instanceof Error ? authError.message : authError}`)
          
          if (authError instanceof Error && authError.message.includes('Authentication required')) {
            console.log(`   💡 This likely means the user DID is not registered with Ring Hub`)
            console.log(`   🔧 Run: npm run user-did:register-sql`)
          }
        }
      }

    } catch (clientError) {
      console.log(`   ❌ Failed to create user Ring Hub client`)
      console.log(`   🔍 Error: ${clientError instanceof Error ? clientError.message : clientError}`)
    }

    // Step 6: Summary and next steps
    console.log('\n📋 User DID Verification Summary:')
    console.log(`   User ID: ${testUserId}`)
    console.log(`   User DID: ${userDIDMapping.did}`)
    console.log(`   DID Format: ${userDIDMapping.did.startsWith('did:web:') ? 'did:web ✅' : 'did:key ⚠️'}`)
    console.log(`   Environment: ${isLocalhost ? 'Development (localhost)' : 'Production (domain)'}`)
    
    console.log('\n🚀 Next Steps:')
    if (isLocalhost) {
      console.log('   Development Mode:')
      console.log('   • User operations will use server DID proxy')
      console.log('   • User attribution tracked in metadata')
      console.log('   • For full user DID testing, deploy to production domain')
    } else {
      console.log('   Production Mode:')
      console.log('   • Run: npm run user-did:register-sql')
      console.log('   • Register the generated SQL with Ring Hub database')
      console.log('   • Test user operations (join, fork, etc.)')
    }

  } catch (error) {
    console.error('❌ User DID verification test failed:', error)
    process.exit(1)
  }
}

async function main() {
  await testUserDIDVerification()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})