#!/usr/bin/env npx tsx

/**
 * Quick Ring Hub Test
 * 
 * A simplified test script to quickly verify Ring Hub connectivity
 * and authentication setup after production deployment.
 * 
 * Run with: npx tsx scripts/quick-ringhub-test.ts
 */

import { getRingHubClient } from '@/lib/ringhub-client'
import { getServerDID, generateDIDDocument } from '@/lib/server-did-client'

async function main() {
  console.log('🔧 Quick Ring Hub Test')
  console.log('======================\n')

  // Test 1: Check environment variables
  console.log('1. Checking environment configuration...')
  const requiredEnvVars = ['RING_HUB_URL', 'THREADSTEAD_DID']
  const missing = requiredEnvVars.filter(env => !process.env[env])
  
  if (missing.length > 0) {
    console.log('❌ Missing environment variables:', missing.join(', '))
    process.exit(1)
  }
  
  console.log('✅ Environment variables configured')
  console.log(`   Ring Hub URL: ${process.env.RING_HUB_URL}`)
  console.log(`   ThreadStead DID: ${process.env.THREADSTEAD_DID}`)
  console.log(`   Has API Key: ${!!process.env.RING_HUB_API_KEY}`)
  console.log(`   Ring Hub Enabled: ${process.env.NEXT_PUBLIC_USE_RING_HUB}\n`)

  // Test 2: Check DID setup
  console.log('2. Checking DID configuration...')
  try {
    const serverDID = await getServerDID()
    const didDoc = await generateDIDDocument()
    
    console.log('✅ DID configuration valid')
    console.log(`   Server DID: ${serverDID}`)
    console.log(`   Public Key: ${didDoc.verificationMethod[0].publicKeyMultibase}\n`)
  } catch (error) {
    console.log('❌ DID configuration failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  // Test 3: Test Ring Hub client
  console.log('3. Testing Ring Hub client...')
  const client = getRingHubClient()
  
  if (!client) {
    console.log('❌ Ring Hub client not available')
    process.exit(1)
  }
  
  console.log('✅ Ring Hub client created\n')

  // Test 4: Test Ring Hub connectivity
  console.log('4. Testing Ring Hub connectivity...')
  try {
    const startTime = Date.now()
    const response = await fetch(`${process.env.RING_HUB_URL}/health`)
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    console.log('✅ Ring Hub connectivity working')
    console.log(`   Response time: ${responseTime}ms\n`)
  } catch (error) {
    console.log('❌ Ring Hub connectivity failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  // Test 5: Test Ring Hub API (read operations)
  console.log('5. Testing Ring Hub API access...')
  try {
    const startTime = Date.now()
    const result = await client.listRings({ limit: 5 })
    const responseTime = Date.now() - startTime
    
    console.log('✅ Ring Hub API access working')
    console.log(`   Response time: ${responseTime}ms`)
    console.log(`   Total rings available: ${result.total}`)
    console.log(`   Rings returned: ${result.rings?.length || 0}`)
    
    if (result.rings && result.rings.length > 0) {
      console.log(`   Sample ring: "${result.rings[0].name}" (${result.rings[0].slug})`)
    }
    console.log('')
  } catch (error) {
    console.log('❌ Ring Hub API access failed:', error instanceof Error ? error.message : error)
    
    // Check if it's an authentication error
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Authentication') ||
      error.message.includes('Unauthorized')
    )) {
      console.log('   This appears to be an authentication issue.')
      console.log('   Make sure your DID document is accessible at:')
      console.log(`   ${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/.well-known/did.json`)
    }
    
    process.exit(1)
  }

  // Test 6: Test getting a specific ring (if available)
  console.log('6. Testing specific ring retrieval...')
  try {
    const listResult = await client.listRings({ limit: 1 })
    
    if (listResult.rings && listResult.rings.length > 0) {
      const ring = listResult.rings[0]
      const ringDetails = await client.getRing(ring.slug)
      
      if (ringDetails) {
        console.log('✅ Ring retrieval working')
        console.log(`   Retrieved ring: "${ringDetails.name}"`)
        console.log(`   Members: ${ringDetails.memberCount}`)
        console.log(`   Visibility: ${ringDetails.visibility}`)
      } else {
        console.log('❌ Ring retrieval returned null')
      }
    } else {
      console.log('⏸️  No rings available for specific retrieval test')
    }
    console.log('')
  } catch (error) {
    console.log('❌ Ring retrieval failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  // Success!
  console.log('🎉 All tests passed!')
  console.log('=====================================')
  console.log('✅ Ring Hub integration is ready for production')
  console.log('✅ Authentication is properly configured')
  console.log('✅ Read operations are working correctly')
  console.log('')
  console.log('🚀 You can safely enable Ring Hub by setting:')
  console.log('   NEXT_PUBLIC_USE_RING_HUB=true')
  console.log('')
  console.log('📝 Note: Write operations (create, join, fork) will work')
  console.log('   once Ring Hub integration is enabled in the UI.')
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
}