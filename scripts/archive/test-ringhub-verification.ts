#!/usr/bin/env npx tsx

/**
 * Test RingHub Verification Script
 * 
 * This script tests if RingHub authentication and verification is working correctly
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getRingHubClient, getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { AuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { db } from '@/lib/db'
import { getOrCreateUserDID } from '@/lib/api/did/server-did-client'

async function testRingHubVerification() {
  console.log('🔐 Testing RingHub Verification')
  console.log('================================')
  
  try {
    // Step 1: Test public client (no auth needed)
    console.log('\n📡 Step 1: Testing public RingHub client...')
    const publicClient = getPublicRingHubClient()
    if (!publicClient) {
      console.log('   ❌ Public client not available')
      console.log('   Check RING_HUB_URL environment variable')
      return
    }
    console.log('   ✅ Public client created')
    
    // Test public endpoint
    try {
      console.log('   Testing public endpoint (get stats)...')
      const stats = await publicClient.getStats()
      console.log('   ✅ Public request successful!')
      console.log(`      Total rings: ${stats.totalRings}`)
      console.log(`      Total actors: ${stats.totalActors}`)
    } catch (error: any) {
      console.log('   ❌ Public request failed:', error.message)
    }
    
    // Step 2: Test server authentication
    console.log('\n🔑 Step 2: Testing server RingHub client...')
    const serverClient = getRingHubClient()
    if (!serverClient) {
      console.log('   ❌ Server client not available')
      console.log('   Check environment variables:')
      console.log('      RING_HUB_URL:', process.env.RING_HUB_URL || 'NOT SET')
      console.log('      THREADSTEAD_DID:', process.env.THREADSTEAD_DID || 'NOT SET')
      console.log('      THREADSTEAD_PRIVATE_KEY_B64URL:', process.env.THREADSTEAD_PRIVATE_KEY_B64URL ? 'SET' : 'NOT SET')
      console.log('      THREADSTEAD_PUBLIC_KEY_MULTIBASE:', process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE || 'NOT SET')
      return
    }
    console.log('   ✅ Server client created')
    console.log(`      Server DID: ${process.env.THREADSTEAD_DID}`)
    
    // Test authenticated endpoint (list my memberships - requires auth)
    try {
      console.log('   Testing authenticated endpoint (my memberships)...')
      const memberships = await serverClient.getMyMemberships()
      console.log('   ✅ Authenticated request successful!')
      console.log(`      Total memberships: ${memberships.total}`)
    } catch (error: any) {
      console.log('   ❌ Authenticated request failed:', error.message)
      if (error.message.includes('signature')) {
        console.log('   💡 Signature verification issue - check DID document')
        console.log('      Your DID:', process.env.THREADSTEAD_DID)
        console.log('      DID document URL: https://homepageagain.com/.well-known/did.json')
      }
    }
    
    // Step 3: Test user authentication
    console.log('\n👤 Step 3: Testing user RingHub authentication...')
    
    // Get a real user
    const users = await db.user.findMany({ 
      take: 1, 
      select: { id: true, primaryHandle: true } 
    })
    
    if (users.length === 0) {
      console.log('   ❌ No users found in database')
      return
    }
    
    const testUser = users[0]
    console.log(`   Testing with user: ${testUser.primaryHandle || testUser.id}`)
    
    // Get user DID
    const userDID = await getOrCreateUserDID(testUser.id)
    console.log(`   User DID: ${userDID.did}`)
    console.log(`   User DID document: https://homepageagain.com/.well-known/did/users/${userDID.userHash}/did.json`)
    
    // Create authenticated client for user
    const userClient = new AuthenticatedRingHubClient(testUser.id)
    
    // Test user operation (get their memberships)
    try {
      console.log('   Testing user authenticated operation (get memberships)...')
      const memberships = await userClient.getMyMemberships()
      console.log('   ✅ User authenticated request successful!')
      console.log(`      User has ${memberships.total} memberships`)
    } catch (error: any) {
      console.log('   ❌ User authenticated request failed:', error.message)
      if (error.message.includes('signature')) {
        console.log('   💡 User signature verification issue')
        console.log('      Check user DID document is accessible')
      }
    }
    
    // Step 4: Test a simple ring operation
    console.log('\n🔗 Step 4: Testing ring operations...')
    
    try {
      console.log('   Fetching The Spool (root ring)...')
      const spool = await publicClient.getRootRing()
      console.log('   ✅ Got The Spool!')
      console.log(`      Name: ${spool.name}`)
      console.log(`      Members: ${spool.memberCount}`)
      console.log(`      Descendants: ${spool.descendantCount}`)
    } catch (error: any) {
      console.log('   ❌ Failed to fetch The Spool:', error.message)
    }
    
    // Step 5: Summary
    console.log('\n📊 Summary:')
    console.log('   Server DID: ' + process.env.THREADSTEAD_DID)
    console.log('   Server DID Document: https://homepageagain.com/.well-known/did.json')
    console.log('   RingHub URL: ' + process.env.RING_HUB_URL)
    
    console.log('\n✨ Quick verification commands:')
    console.log('   1. Check server DID document:')
    console.log('      curl https://homepageagain.com/.well-known/did.json')
    console.log('   2. Check user DID document:')
    console.log(`      curl https://homepageagain.com/.well-known/did/users/${userDID.userHash}/did.json`)
    console.log('   3. Test RingHub stats (public):')
    console.log(`      curl ${process.env.RING_HUB_URL}/trp/stats`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
  }
}

testRingHubVerification().catch(console.error)