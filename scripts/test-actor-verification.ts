#!/usr/bin/env npx tsx

/**
 * Test Actor Verification Status
 * 
 * Makes a simple authenticated request to Ring Hub to see if our actor
 * gets properly verified now that the DID document is accessible.
 * 
 * Run with: npx tsx scripts/test-actor-verification.ts
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getRingHubClient } from '@/lib/ringhub-client'

async function main() {
  console.log('🔍 Testing Actor Verification Status')
  console.log('=====================================')
  
  const client = getRingHubClient()
  if (!client) {
    console.error('❌ Ring Hub client not available')
    process.exit(1)
  }

  console.log('\n📍 Configuration:')
  console.log('   Ring Hub URL:', process.env.RING_HUB_URL)
  console.log('   ThreadStead DID:', process.env.THREADSTEAD_DID)

  console.log('\n🌐 Testing DID Document Accessibility:')
  try {
    const didUrl = `https://homepageagain.com/.well-known/did.json`
    console.log('   Fetching:', didUrl)
    
    const response = await fetch(didUrl)
    if (response.ok) {
      const didDoc = await response.json()
      console.log('   ✅ DID document accessible')
      console.log('   📄 DID:', didDoc.id)
      console.log('   🔑 Public Key:', didDoc.verificationMethod?.[0]?.publicKeyMultibase)
    } else {
      console.log('   ❌ DID document not accessible:', response.status, response.statusText)
      return
    }
  } catch (error) {
    console.log('   ❌ Failed to fetch DID document:', error instanceof Error ? error.message : error)
    return
  }

  console.log('\n🔐 Testing Ring Hub Authentication:')
  try {
    console.log('   Making authenticated request to list rings...')
    const result = await client.listRings({ limit: 1 })
    console.log('   ✅ Authentication successful')
    console.log('   📋 Can read rings:', result.total, 'total rings available')
  } catch (error) {
    console.log('   ❌ Authentication failed:', error instanceof Error ? error.message : error)
    return
  }

  console.log('\n✍️  Testing Write Operation (Ring Creation):')
  try {
    console.log('   Attempting minimal ring creation...')
    const testRing = {
      name: `Verification Test ${Date.now()}`,
      description: 'Minimal test ring to check actor verification',
      visibility: 'PRIVATE' as const,  // Private so it won't clutter public listings
      joinPolicy: 'CLOSED' as const,   // Closed so nobody can join
      curatorNote: 'Test ring - will be deleted immediately'
    }

    const createdRing = await client.createRing(testRing as any)
    console.log('   ✅ Ring creation successful!')
    console.log('   🎯 Created ring:', createdRing.slug)
    console.log('   🏆 Actor is now VERIFIED!')

    // Clean up immediately
    console.log('\n🧹 Cleaning up test ring...')
    try {
      await client.deleteRing(createdRing.slug)
      console.log('   ✅ Test ring cleaned up successfully')
    } catch (cleanupError) {
      console.log('   ⚠️  Could not delete test ring (you may need to clean it up manually):', createdRing.slug)
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('Verification required')) {
      console.log('   ❌ Actor still not verified')
      console.log('   💡 This could be due to:')
      console.log('      - Ring Hub cache (DID resolution cached)')
      console.log('      - Additional verification steps required')
      console.log('      - Ring Hub administrator approval needed')
      
      console.log('\n🔄 Troubleshooting Steps:')
      console.log('   1. Wait 5-10 minutes for Ring Hub cache to expire')
      console.log('   2. Contact Ring Hub administrators')
      console.log('   3. Check Ring Hub logs for verification errors')
      
    } else {
      console.log('   ❌ Unexpected error:', error instanceof Error ? error.message : error)
    }
  }

  console.log('\n📊 Summary:')
  console.log('- DID Document: Accessible ✅')
  console.log('- Authentication: Working ✅')
  console.log('- Read Operations: Working ✅')
  console.log('- Actor Verification: Pending verification...')
}

main().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})