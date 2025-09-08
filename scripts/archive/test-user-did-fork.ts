#!/usr/bin/env npx tsx

/**
 * Test User DID Fork Operation
 * 
 * Tests if user DIDs work correctly for fork operations
 * Can simulate production behavior even in development
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getOrCreateUserDID } from '@/lib/api/did/server-did-client'
import { RingHubClient } from '@/lib/api/ringhub/ringhub-client'

async function testUserDIDFork() {
  console.log('🔍 Testing User DID Fork Operation')
  console.log('====================================')
  
  const testUserId = 'test-fork-user-' + Date.now()
  const parentSlug = 'spool' // The root ring to fork from

  try {
    // Step 1: Create/get user DID (will auto-generate if doesn't exist)
    console.log('\n1️⃣ Getting/Creating User DID...')
    const userDIDMapping = await getOrCreateUserDID(testUserId)
    console.log(`   ✅ User DID: ${userDIDMapping.did}`)
    console.log(`   🔑 Public Key: ${userDIDMapping.publicKey.slice(0, 20)}...`)
    
    // Step 2: Check if we should simulate production
    const simulateProduction = process.argv.includes('--prod')
    const baseUrl = simulateProduction ? 'https://homepageagain.com' : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
    const isLocalhost = !simulateProduction && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))
    
    console.log('\n2️⃣ Environment Configuration:')
    console.log(`   📍 Base URL: ${baseUrl}`)
    console.log(`   🌐 Mode: ${isLocalhost ? 'Development (localhost)' : 'Production (domain)'}`)
    if (simulateProduction) {
      console.log(`   ⚡ Simulating production behavior locally`)
    }
    
    // Step 3: Create Ring Hub client with user DID
    console.log('\n3️⃣ Creating User Ring Hub Client...')
    
    let userClient: RingHubClient
    
    if (isLocalhost && !simulateProduction) {
      console.log(`   ⚠️ Development mode - would use server DID proxy`)
      console.log(`   💡 Run with --prod flag to simulate production behavior`)
      
      // In real development, we'd use server client
      // But for testing, let's try the user DID anyway
      console.log(`   🧪 Testing user DID authentication anyway...`)
    }
    
    // Always create user client for this test
    userClient = new RingHubClient({
      baseUrl: process.env.RING_HUB_URL!,
      instanceDID: userDIDMapping.did,
      privateKeyBase64Url: userDIDMapping.secretKey,
      publicKeyMultibase: userDIDMapping.publicKey
    })
    console.log(`   ✅ User Ring Hub client created`)
    
    // Step 4: Test fork operation
    console.log('\n4️⃣ Testing Fork Operation...')
    console.log(`   🔄 Forking "${parentSlug}" as user ${userDIDMapping.did}`)
    
    try {
      const forkData = {
        name: `Test Fork by User ${Date.now()}`,
        description: `Testing user DID fork operation`,
        curatorNotes: `Forked by user DID: ${userDIDMapping.did}`
      }
      
      console.log(`   📝 Fork data:`, forkData)
      console.log(`   🚀 Sending fork request to Ring Hub...`)
      
      const forkedRing = await userClient.forkRing(parentSlug, forkData)
      
      console.log(`   ✅ Fork successful!`)
      console.log(`   📋 Fork details:`)
      console.log(`      - URI: ${forkedRing.uri}`)
      console.log(`      - Slug: ${forkedRing.slug}`)
      console.log(`      - Name: ${forkedRing.name}`)
      console.log(`      - Parent URI: ${forkedRing.parentUri}`)
      
      // Cast to any to access ownerDid which exists in API response but not in our type
      const forkedRingWithOwner = forkedRing as any
      if (forkedRingWithOwner.ownerDid) {
        console.log(`      - Owner DID: ${forkedRingWithOwner.ownerDid}`)
        
        // Check if owner matches user DID
        if (forkedRingWithOwner.ownerDid === userDIDMapping.did) {
          console.log(`   🎉 SUCCESS: Fork owner matches user DID!`)
          console.log(`   ✨ User has direct ownership in Ring Hub`)
        } else if (forkedRingWithOwner.ownerDid?.includes('homepageagain.com')) {
          console.log(`   ⚠️ Fork owner is server DID: ${forkedRingWithOwner.ownerDid}`)
          console.log(`   💡 This is expected in development mode`)
          console.log(`   📝 Check curator notes for user attribution`)
        } else {
          console.log(`   ❓ Unexpected owner DID: ${forkedRingWithOwner.ownerDid}`)
        }
      } else {
        console.log(`   ℹ️ Owner DID not in response (check curator notes)`)
      }
      
    } catch (forkError) {
      console.log(`   ❌ Fork operation failed`)
      console.log(`   🔍 Error: ${forkError instanceof Error ? forkError.message : forkError}`)
      
      if (forkError instanceof Error && forkError.message.includes('401')) {
        console.log(`   💡 User DID not registered with Ring Hub`)
        console.log(`   🔧 Solutions:`)
        console.log(`      1. Run: npm run user-did:register-sql`)
        console.log(`      2. Execute SQL in Ring Hub database`)
        console.log(`      3. Restart Ring Hub`)
        console.log(`      4. Or use --prod flag with registered DIDs`)
      }
    }
    
    // Step 5: Summary
    console.log('\n📋 Test Summary:')
    console.log(`   User ID: ${testUserId}`)
    console.log(`   User DID: ${userDIDMapping.did}`)
    console.log(`   DID Format: ${userDIDMapping.did.startsWith('did:web:') ? 'did:web ✅' : 'did:key ⚠️'}`)
    console.log(`   Environment: ${isLocalhost ? 'Development' : 'Production'}`)
    if (simulateProduction) {
      console.log(`   Simulation: Production mode active`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

async function main() {
  console.log('💡 Usage: npm run user-did:test-fork [--prod]')
  console.log('   --prod: Simulate production behavior locally\n')
  
  await testUserDIDFork()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})