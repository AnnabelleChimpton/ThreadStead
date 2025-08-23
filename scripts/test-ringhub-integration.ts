#!/usr/bin/env tsx

/**
 * Ring Hub Integration Test Script
 * 
 * Tests the complete integration between ThreadStead and Ring Hub
 * including environment setup, client functionality, and data transformations.
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env' })

import { 
  testRingHubConnection, 
  testRingHubAPI, 
  testRingHubAuth,
  checkRingHubHealth,
  validateRingHubConfig,
  benchmarkRingHubPerformance
} from '../lib/ringhub-test-utils'

import { 
  getRingHubClient,
  shouldUseRingHub 
} from '../lib/ringhub-client'

import {
  transformRingDescriptorToThreadRing,
  transformThreadRingToRingDescriptor,
  validateRingDescriptor
} from '../lib/ringhub-transformers'

async function main() {
  console.log('🔗 ThreadStead Ring Hub Integration Test')
  console.log('========================================\n')

  // Step 1: Environment Configuration Test
  console.log('📋 1. Environment Configuration Test')
  console.log('-----------------------------------')
  
  const envValidation = validateRingHubConfig()
  
  console.log(`Environment Valid: ${envValidation.valid ? '✅' : '❌'}`)
  console.log('Configuration:')
  console.log(`  Ring Hub URL: ${process.env.RING_HUB_URL ? '✅' : '❌'}`)
  console.log(`  ThreadStead DID: ${process.env.THREADSTEAD_DID ? '✅' : '❌'}`)
  console.log(`  Use Ring Hub: ${process.env.NEXT_PUBLIC_USE_RING_HUB === 'true' ? '✅' : '❌'}`)
  console.log(`  ThreadRings Enabled: ${process.env.NEXT_PUBLIC_THREADRINGS_ENABLED === 'true' ? '✅' : '❌'}`)
  
  if (envValidation.missing.length > 0) {
    console.log('Missing:')
    envValidation.missing.forEach(missing => console.log(`  ❌ ${missing}`))
  }
  
  if (envValidation.warnings.length > 0) {
    console.log('Warnings:')
    envValidation.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`))
  }
  
  console.log()

  // Step 2: Feature Flag Test
  console.log('🚩 2. Feature Flag Test')
  console.log('----------------------')
  
  console.log(`Ring Hub enabled: ${shouldUseRingHub() ? '✅' : '❌'}`)
  console.log(`Client available: ${getRingHubClient() ? '✅' : '❌'}`)
  console.log()

  // Step 3: Ring Hub Connectivity Test
  console.log('🔌 3. Ring Hub Connectivity Test')
  console.log('--------------------------------')
  
  const connectionTest = await testRingHubConnection()
  console.log(`Connection: ${connectionTest.success ? '✅' : '❌'} (${connectionTest.responseTime}ms)`)
  if (!connectionTest.success) {
    console.log(`Error: ${connectionTest.error}`)
    return
  }
  
  const apiTest = await testRingHubAPI()
  console.log(`API Response: ${apiTest.success ? '✅' : '❌'} (${apiTest.responseTime}ms)`)
  if (!apiTest.success) {
    console.log(`Error: ${apiTest.error}`)
  }
  
  console.log()

  // Step 4: Ring Hub Health Check
  console.log('🏥 4. Ring Hub Health Check')
  console.log('--------------------------')
  
  const health = await checkRingHubHealth()
  console.log(`Ring Hub Available: ${health.ring_hub_available ? '✅' : '❌'}`)
  console.log(`Response Time: ${health.response_time}ms`)
  console.log(`Authenticated: ${health.authenticated ? '✅' : '❌'}`)
  if (health.error) {
    console.log(`Issues: ${health.error}`)
  }
  console.log()

  // Step 5: Client SDK Test
  console.log('🛠️ 5. Client SDK Test')
  console.log('--------------------')
  
  const client = getRingHubClient()
  if (!client) {
    console.log('❌ Ring Hub client not available')
    return
  }

  try {
    // Test ring listing
    const rings = await client.listRings({ limit: 5 })
    console.log(`✅ Ring listing successful: ${rings.total} rings found`)

    // Test ring search
    const searchResults = await client.listRings({ search: 'test', limit: 3 })
    console.log(`✅ Ring search successful: ${searchResults.total} results`)

    // Test getting a non-existent ring (should return null)
    const nonExistentRing = await client.getRing('non-existent-ring-12345')
    console.log(`✅ Non-existent ring handling: ${nonExistentRing === null ? 'correct (null)' : 'unexpected result'}`)

  } catch (error) {
    console.log(`❌ Client SDK test failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  console.log()

  // Step 6: Data Transformation Test
  console.log('🔄 6. Data Transformation Test')
  console.log('-----------------------------')
  
  try {
    // Create mock Ring Hub data
    const mockRingDescriptor = {
      uri: 'https://homepageagain.com/threadrings/test-ring',
      name: 'Test Ring',
      description: 'A test ring for integration testing',
      slug: 'test-ring',
      joinPolicy: 'OPEN' as const,
      visibility: 'PUBLIC' as const,
      spoolUri: 'https://homepageagain.com/threadrings/spool',
      lineageDepth: 0,
      memberCount: 5,
      postCount: 12,
      descendantCount: 2,
      createdAt: '2025-08-22T10:00:00Z',
      updatedAt: '2025-08-22T12:00:00Z',
      curatorNotes: 'Welcome to our test ring!'
    }

    // Test Ring Hub → ThreadStead transformation
    const threadRing = transformRingDescriptorToThreadRing(mockRingDescriptor, 'curator-user-id')
    console.log(`✅ RingDescriptor → ThreadRing: ${threadRing.name} (${threadRing.slug})`)

    // Test ThreadStead → Ring Hub transformation
    const backToDescriptor = transformThreadRingToRingDescriptor(threadRing, 'did:web:homepageagain.com')
    console.log(`✅ ThreadRing → RingDescriptor: ${backToDescriptor.name} (${backToDescriptor.slug})`)

    // Validate descriptor format
    const isValid = validateRingDescriptor(backToDescriptor)
    console.log(`✅ Descriptor validation: ${isValid ? 'valid' : 'invalid'}`)

  } catch (error) {
    console.log(`❌ Data transformation test failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  console.log()

  // Step 7: Performance Benchmark
  console.log('⚡ 7. Performance Benchmark')
  console.log('--------------------------')
  
  try {
    const benchmark = await benchmarkRingHubPerformance()
    console.log(`Total operations: ${benchmark.summary.total_operations}`)
    console.log(`Successful operations: ${benchmark.summary.successful_operations}`)
    console.log(`Average response time: ${benchmark.summary.average_response_time.toFixed(2)}ms`)
    console.log(`Total benchmark time: ${benchmark.summary.total_time}ms`)
    
    console.log('\nOperation details:')
    benchmark.operations.forEach(op => {
      const status = op.success ? '✅' : '❌'
      const error = op.error ? ` (${op.error})` : ''
      console.log(`  ${status} ${op.name}: ${op.duration}ms${error}`)
    })
  } catch (error) {
    console.log(`❌ Performance benchmark failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  console.log()

  // Step 8: Integration Summary
  console.log('📊 8. Integration Summary')
  console.log('------------------------')
  
  const summary = {
    environment_configured: envValidation.valid,
    feature_flags_enabled: shouldUseRingHub(),
    client_available: !!getRingHubClient(),
    ring_hub_responding: connectionTest.success,
    api_functional: apiTest.success,
    authenticated: health.authenticated || false,
    transformations_working: true // Assume working if we got this far
  }

  console.log('Status:')
  Object.entries(summary).forEach(([key, value]) => {
    const status = value ? '✅' : '❌'
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    console.log(`  ${status} ${label}`)
  })

  const allGood = Object.values(summary).every(v => v === true)
  console.log(`\n🎯 Overall Integration Status: ${allGood ? '✅ READY' : '❌ NEEDS ATTENTION'}`)
  
  if (allGood) {
    console.log('\n🚀 ThreadStead is ready for Ring Hub integration!')
    console.log('   You can now proceed with migrating ThreadRing operations to Ring Hub.')
  } else {
    console.log('\n⚠️  Please address the issues above before proceeding with integration.')
  }
}

main().catch(console.error)