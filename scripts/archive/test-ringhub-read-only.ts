#!/usr/bin/env npx tsx

/**
 * Ring Hub Read-Only Operations Test
 * 
 * Tests Ring Hub read operations (list, get) without requiring write permissions.
 * This can help verify authentication works for read operations.
 * 
 * Run with: npx tsx scripts/test-ringhub-read-only.ts
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'

// Load .env files the same way Next.js does
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getRingHubClient } from '@/lib/ringhub-client'
import { getServerDID } from '@/lib/server-did-client'

interface TestResult {
  operation: string
  status: 'PASS' | 'FAIL'
  message: string
  details?: any
  duration: number
}

const results: TestResult[] = []

function logResult(operation: string, status: 'PASS' | 'FAIL', message: string, details?: any, duration?: number) {
  const result: TestResult = {
    operation,
    status,
    message,
    details,
    duration: duration || 0
  }
  results.push(result)
  
  const icon = status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} ${operation}: ${message}`)
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2))
  }
}

async function testListRings() {
  console.log('\n📋 Testing Ring Listing...')
  const startTime = Date.now()
  
  const client = getRingHubClient()
  if (!client) {
    logResult('List Rings', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    const result = await client.listRings({ limit: 5 })
    
    if (result && typeof result.total === 'number') {
      logResult('List Rings', 'PASS', `Retrieved ${result.rings?.length || 0} rings (total: ${result.total})`, result, Date.now() - startTime)
      return true
    } else {
      logResult('List Rings', 'FAIL', 'Invalid listRings response', result, Date.now() - startTime)
      return false
    }
  } catch (error) {
    console.error('❌ Full error details:', error)
    logResult('List Rings', 'FAIL', error instanceof Error ? error.message : String(error), null, Date.now() - startTime)
    return false
  }
}

async function testGetSpecificRing() {
  console.log('\n🔍 Testing Specific Ring Retrieval...')
  const startTime = Date.now()
  
  const client = getRingHubClient()
  if (!client) {
    logResult('Get Ring', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    // First get a list of rings to find one to test with
    const listResult = await client.listRings({ limit: 1 })
    
    if (!listResult.rings || listResult.rings.length === 0) {
      logResult('Get Ring', 'PASS', 'No rings available to test retrieval', null, Date.now() - startTime)
      return true
    }
    
    const testRing = listResult.rings[0]
    const ring = await client.getRing(testRing.slug)
    
    if (ring && ring.slug === testRing.slug) {
      logResult('Get Ring', 'PASS', `Ring retrieved successfully: ${testRing.slug}`, ring, Date.now() - startTime)
      return true
    } else {
      logResult('Get Ring', 'FAIL', 'Ring not found or data mismatch', ring, Date.now() - startTime)
      return false
    }
  } catch (error) {
    console.error('❌ Full error details:', error)
    logResult('Get Ring', 'FAIL', error instanceof Error ? error.message : String(error), null, Date.now() - startTime)
    return false
  }
}

async function main() {
  console.log('🧪 Ring Hub Read-Only Operations Test')
  console.log('======================================')
  console.log('ℹ️  This test only performs read operations (no writes)')

  // Check environment
  const ringHubUrl = process.env.RING_HUB_URL
  const threadsteadDID = process.env.THREADSTEAD_DID
  
  if (!ringHubUrl || !threadsteadDID) {
    console.error('❌ Missing required environment variables')
    console.error('   RING_HUB_URL:', ringHubUrl || 'NOT SET')
    console.error('   THREADSTEAD_DID:', threadsteadDID || 'NOT SET')
    process.exit(1)
  }

  console.log('\n📍 Configuration:')
  console.log('   Ring Hub URL:', ringHubUrl)
  console.log('   ThreadStead DID:', threadsteadDID)
  console.log('   Ring Hub Enabled:', process.env.NEXT_PUBLIC_USE_RING_HUB || 'false')

  console.log('\n🚀 Starting read operations tests...')
  
  // Test 1: List rings
  await testListRings()
  
  // Test 2: Get specific ring
  await testGetSpecificRing()

  // Summary
  console.log('\n📊 Test Summary')
  console.log('================')
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏱️  Total Duration: ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Operations:')
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`   - ${r.operation}: ${r.message}`))
  }
  
  if (failed === 0) {
    console.log('\n🎉 All read operations tests passed!')
    console.log('✅ Ring Hub read operations are working correctly')
    console.log('💡 The "Verification required" error only affects write operations')
    console.log('   Contact Ring Hub administrators to register your instance for write access')
  } else {
    console.log('\n⚠️ Some read operations failed')
    console.log('Check the error messages above for details')
  }
  
  process.exit(failed === 0 ? 0 : 1)
}

// Handle errors
process.on('unhandledRejection', async (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
}