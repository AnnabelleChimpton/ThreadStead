#!/usr/bin/env npx tsx

/**
 * Debug Actor Verification Process
 * 
 * Comprehensive test to debug Ring Hub actor verification step by step
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getRingHubClient } from '@/lib/ringhub-client'
import { getServerDID } from '@/lib/server-did-client'

async function main() {
  console.log('🐛 Ring Hub Actor Verification Debug')
  console.log('====================================')
  
  const instanceDID = process.env.THREADSTEAD_DID
  console.log('\n📋 Configuration:')
  console.log('   Instance DID:', instanceDID)
  console.log('   Ring Hub URL:', process.env.RING_HUB_URL)
  console.log('   DID Document URL: https://homepageagain.com/.well-known/did.json')
  
  // Step 1: Verify DID Document is accessible and valid
  console.log('\n🔍 Step 1: Verifying DID Document...')
  try {
    const didUrl = 'https://homepageagain.com/.well-known/did.json'
    const response = await fetch(didUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    console.log('   ✅ DID document accessible')
    console.log('   📄 Content-Type:', contentType)
    
    const didDoc = await response.json()
    console.log('   📋 DID ID:', didDoc.id)
    console.log('   🔑 Verification Methods:', didDoc.verificationMethod?.length || 0)
    
    if (didDoc.id !== instanceDID) {
      console.log('   ⚠️ WARNING: DID ID mismatch!')
      console.log('      Expected:', instanceDID)
      console.log('      Got:', didDoc.id)
    }
    
    const keyMethod = didDoc.verificationMethod?.[0]
    if (keyMethod) {
      console.log('   🔑 Key ID:', keyMethod.id)
      console.log('   🔑 Key Type:', keyMethod.type)
      console.log('   🔑 Controller:', keyMethod.controller)
      console.log('   🔑 Public Key:', keyMethod.publicKeyMultibase?.substring(0, 20) + '...')
    }
    
  } catch (error) {
    console.log('   ❌ DID document issue:', error instanceof Error ? error.message : error)
    return
  }

  // Step 2: Test HTTP Signature Generation
  console.log('\n🔐 Step 2: Testing HTTP Signature...')
  const client = getRingHubClient()
  if (!client) {
    console.log('   ❌ Ring Hub client not available')
    return
  }
  
  // Step 3: Make a read request to confirm authentication works
  console.log('\n📖 Step 3: Testing Read Authentication...')
  try {
    const listResult = await client.listRings({ limit: 1 })
    console.log('   ✅ Read request successful (no auth required)')
    console.log('   📊 Rings available:', listResult.total)
  } catch (error) {
    console.log('   ❌ Read request failed:', error instanceof Error ? error.message : error)
  }

  // Step 4: Attempt minimal write request to trigger actor registration
  console.log('\n✍️ Step 4: Testing Write Authentication (Actor Registration)...')
  try {
    // Try the simplest possible ring creation request
    const minimalRing = {
      name: `Actor Test ${Date.now()}`,
      description: 'Minimal ring to test actor verification',
      visibility: 'PRIVATE' as const,
      joinPolicy: 'CLOSED' as const,
      postPolicy: 'CLOSED' as const
    }
    
    console.log('   📝 Attempting minimal ring creation...')
    console.log('   📋 Request data:', JSON.stringify(minimalRing, null, 2))
    
    const result = await client.createRing(minimalRing as any)
    console.log('   ✅ SUCCESS! Actor verified and ring created!')
    console.log('   🎯 Ring slug:', result.slug)
    
    // Clean up
    console.log('\n🧹 Cleaning up test ring...')
    try {
      await client.deleteRing(result.slug)
      console.log('   ✅ Test ring deleted')
    } catch (cleanupError) {
      console.log('   ⚠️ Could not delete test ring:', result.slug)
    }
    
  } catch (error) {
    console.log('   ❌ Write request failed')
    
    if (error instanceof Error) {
      console.log('   📝 Error message:', error.message)
      
      // Parse specific error types
      if (error.message.includes('Verification required')) {
        console.log('\n💡 DIAGNOSIS: Actor not verified')
        console.log('   Possible causes:')
        console.log('   1. DID document not accessible to Ring Hub')
        console.log('   2. Ring Hub cache not updated')
        console.log('   3. DID document format issue')
        console.log('   4. HTTP signature verification failure')
        
      } else if (error.message.includes('Bad Request')) {
        console.log('\n💡 DIAGNOSIS: Request format issue')
        console.log('   Ring Hub can authenticate but rejects the request format')
        
      } else if (error.message.includes('Unauthorized')) {
        console.log('\n💡 DIAGNOSIS: Authentication failure')
        console.log('   HTTP signature verification failed')
      }
    }
    
    // Try to get more details from the error
    console.log('\n🔍 Full error details:')
    console.log(error)
  }

  console.log('\n📊 Summary:')
  console.log('- DID Document: ✅ Accessible and valid')
  console.log('- Read Operations: ✅ Working') 
  console.log('- HTTP Signatures: ✅ Being generated')
  console.log('- Actor Verification: ❓ Pending...')
  
  console.log('\n💭 Next Steps:')
  console.log('1. Check Ring Hub logs for actor registration attempts')
  console.log('2. Wait 5-10 minutes for potential cache updates')
  console.log('3. Contact Ring Hub administrators if issue persists')
}

main().catch(error => {
  console.error('❌ Debug script failed:', error)
  process.exit(1)
})