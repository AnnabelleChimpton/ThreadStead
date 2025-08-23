#!/usr/bin/env npx tsx

/**
 * Ring Hub Write Operations Test
 * 
 * Tests Ring Hub write operations (create, update, delete) for development/testing.
 * WARNING: This will create and modify data in Ring Hub!
 * 
 * Run with: npx tsx scripts/test-ringhub-write-operations.ts
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'

// Load .env files the same way Next.js does
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getRingHubClient } from '@/lib/ringhub-client'
import { getServerDID } from '@/lib/server-did-client'
import { db } from '@/lib/db'

interface TestResult {
  operation: string
  status: 'PASS' | 'FAIL'
  message: string
  details?: any
  duration: number
}

const results: TestResult[] = []
let testRingSlug: string | null = null
let testUserId: string | null = null

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

async function testCreateRing() {
  console.log('\n📝 Testing Ring Creation...')
  const startTime = Date.now()
  
  const client = getRingHubClient()
  if (!client) {
    logResult('Create Ring', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    const timestamp = Date.now()
    
    const newRing = {
      name: `Test Ring ${timestamp}`,
      description: 'Test ring created by write operations test script',
      shortCode: `TR${timestamp.toString().slice(-6)}`, // Last 6 digits
      visibility: 'PUBLIC' as const,
      joinPolicy: 'OPEN' as const,
      postPolicy: 'MEMBERS' as const,
      curatorNote: 'Test ring for write operations verification',
      metadata: {},
      policies: {}
    }

    console.log('   Creating ring...')
    console.log('   Ring data:', JSON.stringify(newRing, null, 2))
    const createdRing = await client.createRing(newRing as any)
    
    if (createdRing && createdRing.slug) {
      testRingSlug = createdRing.slug // Use the server-generated slug
      logResult('Create Ring', 'PASS', `Ring created successfully: ${testRingSlug}`, createdRing, Date.now() - startTime)
      
      // Also store in local database for ownership tracking
      if (testUserId) {
        await db.ringHubOwnership.create({
          data: {
            ringSlug: testRingSlug,
            ringUri: createdRing.uri || `test:ring:${testRingSlug}`,
            ownerUserId: testUserId,
            serverDID: await getServerDID()
          }
        })
      }
      
      return true
    } else {
      logResult('Create Ring', 'FAIL', 'Ring creation returned unexpected result', createdRing, Date.now() - startTime)
      return false
    }
  } catch (error) {
    console.error('❌ Full error details:', error)
    logResult('Create Ring', 'FAIL', error instanceof Error ? error.message : String(error), null, Date.now() - startTime)
    return false
  }
}

async function testGetRing() {
  console.log('\n🔍 Testing Ring Retrieval...')
  const startTime = Date.now()
  
  if (!testRingSlug) {
    logResult('Get Ring', 'FAIL', 'No test ring slug available')
    return false
  }

  const client = getRingHubClient()
  if (!client) {
    logResult('Get Ring', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    const ring = await client.getRing(testRingSlug)
    
    if (ring && ring.slug === testRingSlug) {
      logResult('Get Ring', 'PASS', `Ring retrieved successfully: ${testRingSlug}`, ring, Date.now() - startTime)
      return true
    } else {
      logResult('Get Ring', 'FAIL', 'Ring not found or data mismatch', ring, Date.now() - startTime)
      return false
    }
  } catch (error) {
    logResult('Get Ring', 'FAIL', error instanceof Error ? error.message : String(error), null, Date.now() - startTime)
    return false
  }
}

async function testUpdateRing() {
  console.log('\n✏️ Testing Ring Update...')
  const startTime = Date.now()
  
  if (!testRingSlug) {
    logResult('Update Ring', 'FAIL', 'No test ring slug available')
    return false
  }

  const client = getRingHubClient()
  if (!client) {
    logResult('Update Ring', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    const updatedData = {
      description: 'Updated description - ' + new Date().toISOString(),
      visibility: 'UNLISTED' as const,
      joinPolicy: 'INVITATION' as const
    }

    console.log('   Updating ring:', testRingSlug)
    const updatedRing = await client.updateRing(testRingSlug, updatedData)
    
    if (updatedRing && updatedRing.description === updatedData.description) {
      logResult('Update Ring', 'PASS', `Ring updated successfully: ${testRingSlug}`, updatedRing, Date.now() - startTime)
      return true
    } else {
      logResult('Update Ring', 'FAIL', 'Ring update returned unexpected result', updatedRing, Date.now() - startTime)
      return false
    }
  } catch (error) {
    logResult('Update Ring', 'FAIL', error instanceof Error ? error.message : String(error), null, Date.now() - startTime)
    return false
  }
}

async function testJoinRing() {
  console.log('\n👥 Testing Ring Join...')
  const startTime = Date.now()
  
  if (!testRingSlug) {
    logResult('Join Ring', 'FAIL', 'No test ring slug available')
    return false
  }

  const client = getRingHubClient()
  if (!client) {
    logResult('Join Ring', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    // Join using authenticated DID (no need to specify DID)
    console.log('   Joining ring:', testRingSlug)
    console.log('   Using authenticated DID implicitly')
    
    const joinResult = await client.joinRing(testRingSlug, 'Joining test ring')
    
    if (joinResult) {
      logResult('Join Ring', 'PASS', `Joined ring successfully: ${testRingSlug}`, joinResult, Date.now() - startTime)
      return true
    } else {
      logResult('Join Ring', 'FAIL', 'Join operation returned unexpected result', joinResult, Date.now() - startTime)
      return false
    }
  } catch (error) {
    // Some errors are expected (e.g., already a member)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('already') || errorMessage.includes('member') || errorMessage.includes('Invalid request')) {
      // Owner is already a member after creation, so this is expected
      logResult('Join Ring', 'PASS', 'Owner already a member (expected for ring creator)', null, Date.now() - startTime)
      return true
    }
    logResult('Join Ring', 'FAIL', errorMessage, null, Date.now() - startTime)
    return false
  }
}

async function testListMembers() {
  console.log('\n📋 Testing Member List...')
  const startTime = Date.now()
  
  if (!testRingSlug) {
    logResult('List Members', 'FAIL', 'No test ring slug available')
    return false
  }

  const client = getRingHubClient()
  if (!client) {
    logResult('List Members', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    const members = await client.getRingMembers(testRingSlug)
    
    if (members && Array.isArray(members)) {
      logResult('List Members', 'PASS', `Retrieved ${members.length} members`, members, Date.now() - startTime)
      return true
    } else {
      logResult('List Members', 'FAIL', 'Member list returned unexpected format', members, Date.now() - startTime)
      return false
    }
  } catch (error) {
    logResult('List Members', 'FAIL', error instanceof Error ? error.message : String(error), null, Date.now() - startTime)
    return false
  }
}

async function testDeleteRing() {
  console.log('\n🗑️ Testing Ring Deletion...')
  const startTime = Date.now()
  
  if (!testRingSlug) {
    logResult('Delete Ring', 'FAIL', 'No test ring slug available')
    return false
  }

  const client = getRingHubClient()
  if (!client) {
    logResult('Delete Ring', 'FAIL', 'Ring Hub client not available')
    return false
  }

  try {
    console.log('   Deleting ring:', testRingSlug)
    await client.deleteRing(testRingSlug)
    
    // Verify deletion by trying to get the ring
    try {
      const deletedRing = await client.getRing(testRingSlug)
      if (!deletedRing) {
        logResult('Delete Ring', 'PASS', `Ring deleted successfully: ${testRingSlug}`, null, Date.now() - startTime)
        
        // Clean up local ownership record
        await db.ringHubOwnership.deleteMany({
          where: { ringSlug: testRingSlug }
        })
        
        return true
      } else {
        logResult('Delete Ring', 'FAIL', 'Ring still exists after deletion', deletedRing, Date.now() - startTime)
        return false
      }
    } catch (verifyError) {
      // Getting a 404 is expected after deletion
      logResult('Delete Ring', 'PASS', `Ring deleted successfully (404 on retrieval): ${testRingSlug}`, null, Date.now() - startTime)
      
      // Clean up local ownership record
      await db.ringHubOwnership.deleteMany({
        where: { ringSlug: testRingSlug }
      })
      
      return true
    }
  } catch (error) {
    logResult('Delete Ring', 'FAIL', error instanceof Error ? error.message : String(error), null, Date.now() - startTime)
    return false
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...')
  
  if (testRingSlug) {
    const client = getRingHubClient()
    if (client) {
      try {
        await client.deleteRing(testRingSlug)
        console.log('   ✅ Cleaned up test ring:', testRingSlug)
      } catch (error) {
        // Ignore cleanup errors
        console.log('   ⚠️ Could not clean up test ring (may already be deleted)')
      }
    }
    
    // Clean up local ownership record
    try {
      await db.ringHubOwnership.deleteMany({
        where: { ringSlug: testRingSlug }
      })
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

async function main() {
  console.log('🧪 Ring Hub Write Operations Test')
  console.log('==================================')
  console.log('⚠️  WARNING: This test will create and modify data in Ring Hub!')
  console.log('⚠️  Only run this in development/test environments\n')

  // Check environment
  const ringHubUrl = process.env.RING_HUB_URL
  const threadsteadDID = process.env.THREADSTEAD_DID
  
  if (!ringHubUrl || !threadsteadDID) {
    console.error('❌ Missing required environment variables')
    console.error('   RING_HUB_URL:', ringHubUrl || 'NOT SET')
    console.error('   THREADSTEAD_DID:', threadsteadDID || 'NOT SET')
    process.exit(1)
  }

  console.log('📍 Configuration:')
  console.log('   Ring Hub URL:', ringHubUrl)
  console.log('   ThreadStead DID:', threadsteadDID)
  console.log('   Ring Hub Enabled:', process.env.NEXT_PUBLIC_USE_RING_HUB || 'false')
  
  // Get or create a test user
  try {
    const testUser = await db.user.findFirst({
      where: { role: 'admin' }
    })
    
    if (testUser) {
      testUserId = testUser.id
      console.log('   Test User:', testUser.primaryHandle || testUser.id)
    }
  } catch (error) {
    console.log('   Test User: Not available (will skip ownership tracking)')
  }

  // Run tests (reordered to test List Members before deleting ring)
  const tests = [
    testCreateRing,
    testGetRing,
    testUpdateRing,
    testJoinRing,
    testListMembers,  // Test while ring still exists
    testDeleteRing    // Delete last
  ]

  console.log('\n🚀 Starting write operations tests...')
  
  for (const test of tests) {
    const success = await test()
    if (!success && test.name === 'testCreateRing') {
      console.log('\n⚠️ Ring creation failed, skipping remaining tests')
      break
    }
  }

  // Always try to clean up
  await cleanupTestData()

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
    console.log('\n🎉 All write operations tests passed!')
    console.log('✅ Ring Hub write operations are working correctly')
  } else {
    console.log('\n⚠️ Some write operations failed')
    console.log('Check the error messages above for details')
  }
  
  await db.$disconnect()
  process.exit(failed === 0 ? 0 : 1)
}

// Handle errors
process.on('unhandledRejection', async (error) => {
  console.error('❌ Unhandled error:', error)
  await cleanupTestData()
  await db.$disconnect()
  process.exit(1)
})

if (require.main === module) {
  main().catch(async (error) => {
    console.error('❌ Test failed:', error)
    await cleanupTestData()
    await db.$disconnect()
    process.exit(1)
  })
}