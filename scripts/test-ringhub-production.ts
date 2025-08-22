#!/usr/bin/env npx tsx

/**
 * Ring Hub Production Readiness Tests
 * 
 * Tests Ring Hub connectivity, authentication, and read operations
 * without enabling ThreadRing features or making write operations.
 * 
 * Run with: npx tsx scripts/test-ringhub-production.ts
 */

import { 
  testRingHubConnection, 
  testRingHubAPI, 
  checkRingHubHealth,
  validateRingHubConfig,
  benchmarkRingHubPerformance
} from '@/lib/ringhub-test-utils'
import { getRingHubClient } from '@/lib/ringhub-client'
import { generateDIDDocument, getServerDID } from '@/lib/server-did-client'
import fetch from 'node-fetch'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
  duration?: number
}

const results: TestResult[] = []

function addResult(result: TestResult) {
  results.push(result)
  const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏸️'
  console.log(`${status} ${result.name}: ${result.message}`)
  if (result.details) {
    console.log(`   Details:`, result.details)
  }
}

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
  const startTime = Date.now()
  try {
    const result = await testFn()
    const duration = Date.now() - startTime
    addResult({
      name,
      status: 'PASS',
      message: 'Test passed',
      details: result,
      duration
    })
  } catch (error) {
    const duration = Date.now() - startTime
    addResult({
      name,
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error),
      duration
    })
  }
}

async function testEnvironmentConfiguration() {
  const config = validateRingHubConfig()
  
  if (!config.valid) {
    throw new Error(`Missing required environment variables: ${config.missing.join(', ')}`)
  }
  
  return {
    valid: config.valid,
    warnings: config.warnings,
    environment: {
      RING_HUB_URL: process.env.RING_HUB_URL,
      THREADSTEAD_DID: process.env.THREADSTEAD_DID,
      HAS_API_KEY: !!process.env.RING_HUB_API_KEY,
      USE_RING_HUB: process.env.NEXT_PUBLIC_USE_RING_HUB
    }
  }
}

async function testDIDDocumentGeneration() {
  const didDoc = await generateDIDDocument()
  const serverDID = await getServerDID()
  
  if (!didDoc.id || !didDoc.verificationMethod || didDoc.verificationMethod.length === 0) {
    throw new Error('Invalid DID document structure')
  }
  
  if (didDoc.id !== serverDID) {
    throw new Error(`DID mismatch: document=${didDoc.id}, server=${serverDID}`)
  }
  
  return {
    did: serverDID,
    verificationMethod: didDoc.verificationMethod[0],
    contexts: didDoc['@context']
  }
}

async function testDIDDocumentAccessibility() {
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error('NEXT_PUBLIC_BASE_URL not set - cannot test DID document accessibility')
  }
  
  const didEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/.well-known/did.json`
  
  try {
    const response = await fetch(didEndpoint)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/did+json') && !contentType?.includes('application/json')) {
      throw new Error(`Invalid content type: ${contentType}`)
    }
    
    const didDoc = await response.json() as any
    
    if (!didDoc.id || !didDoc.verificationMethod) {
      throw new Error('Invalid DID document structure from endpoint')
    }
    
    return {
      endpoint: didEndpoint,
      status: response.status,
      contentType,
      did: didDoc.id,
      publicKey: didDoc.verificationMethod[0]?.publicKeyMultibase
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error(`Cannot reach DID endpoint: ${didEndpoint}. Ensure the application is deployed and accessible.`)
    }
    throw error
  }
}

async function testRingHubBasicConnectivity() {
  const result = await testRingHubConnection()
  
  if (!result.success) {
    throw new Error(result.error || 'Connection failed')
  }
  
  return {
    success: result.success,
    responseTime: result.responseTime,
    endpoint: result.endpoint
  }
}

async function testRingHubAPIAccess() {
  const result = await testRingHubAPI()
  
  if (!result.success) {
    throw new Error(result.error || 'API access failed')
  }
  
  return {
    success: result.success,
    responseTime: result.responseTime,
    endpoint: result.endpoint
  }
}

async function testRingHubReadOperations() {
  const client = getRingHubClient()
  
  if (!client) {
    throw new Error('Ring Hub client not available')
  }
  
  // Test listing rings (read operation)
  const listResult = await client.listRings({ limit: 5 })
  
  if (!listResult || typeof listResult.total !== 'number') {
    throw new Error('Invalid listRings response')
  }
  
  // Test getting a specific ring if any exist
  let getRingResult = null
  if (listResult.rings && listResult.rings.length > 0) {
    const firstRing = listResult.rings[0]
    getRingResult = await client.getRing(firstRing.slug)
    
    if (!getRingResult || getRingResult.slug !== firstRing.slug) {
      throw new Error('Invalid getRing response')
    }
  }
  
  return {
    listRings: {
      total: listResult.total,
      count: listResult.rings?.length || 0,
      sampleRing: listResult.rings?.[0]?.slug
    },
    getRing: getRingResult ? {
      slug: getRingResult.slug,
      name: getRingResult.name,
      memberCount: getRingResult.memberCount
    } : 'No rings available for testing'
  }
}

async function testRingHubAuthentication() {
  const client = getRingHubClient()
  
  if (!client) {
    throw new Error('Ring Hub client not available')
  }
  
  try {
    // Try a simple authenticated request (this should work with proper auth)
    const result = await client.listRings({ limit: 1 })
    
    return {
      authenticated: true,
      method: 'HTTP Signature Authentication',
      serverDID: await getServerDID(),
      testOperation: 'listRings',
      success: true
    }
  } catch (error) {
    // Check if it's an auth error specifically
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Authentication') ||
      error.message.includes('Unauthorized')
    )) {
      throw new Error(`Authentication failed: ${error.message}`)
    }
    
    // Other errors might be network/service issues
    throw new Error(`Request failed (may not be auth issue): ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function testRingHubHealthCheck() {
  const health = await checkRingHubHealth()
  
  if (!health.ring_hub_available) {
    throw new Error(health.error || 'Ring Hub not available')
  }
  
  return {
    available: health.ring_hub_available,
    responseTime: health.response_time,
    authenticated: health.authenticated,
    error: health.error
  }
}

async function testRingHubPerformance() {
  const benchmark = await benchmarkRingHubPerformance()
  
  const failedOps = benchmark.operations.filter(op => !op.success)
  if (failedOps.length === benchmark.operations.length) {
    throw new Error('All performance test operations failed')
  }
  
  return {
    summary: benchmark.summary,
    operations: benchmark.operations,
    performance: {
      averageResponseTime: `${benchmark.summary.average_response_time}ms`,
      successRate: `${(benchmark.summary.successful_operations / benchmark.summary.total_operations * 100).toFixed(1)}%`
    }
  }
}

async function main() {
  console.log('🔧 Ring Hub Production Readiness Tests')
  console.log('======================================\n')
  
  // Test 1: Environment Configuration
  await runTest('Environment Configuration', testEnvironmentConfiguration)
  
  // Test 2: DID Document Generation
  await runTest('DID Document Generation', testDIDDocumentGeneration)
  
  // Test 3: DID Document Web Accessibility
  await runTest('DID Document Web Accessibility', testDIDDocumentAccessibility)
  
  // Test 4: Ring Hub Basic Connectivity
  await runTest('Ring Hub Basic Connectivity', testRingHubBasicConnectivity)
  
  // Test 5: Ring Hub API Access
  await runTest('Ring Hub API Access', testRingHubAPIAccess)
  
  // Test 6: Ring Hub Read Operations
  await runTest('Ring Hub Read Operations', testRingHubReadOperations)
  
  // Test 7: Ring Hub Authentication
  await runTest('Ring Hub Authentication', testRingHubAuthentication)
  
  // Test 8: Ring Hub Health Check
  await runTest('Ring Hub Health Check', testRingHubHealthCheck)
  
  // Test 9: Ring Hub Performance
  await runTest('Ring Hub Performance', testRingHubPerformance)
  
  // Summary
  console.log('\n📊 Test Summary')
  console.log('================')
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏸️ Skipped: ${skipped}`)
  console.log(`📈 Total: ${results.length}`)
  
  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
  
  console.log(`⏱️ Average Duration: ${avgDuration.toFixed(0)}ms\n`)
  
  if (failed > 0) {
    console.log('❌ Some tests failed. Ring Hub integration may not be ready for production.')
    console.log('\nFailed tests:')
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`  - ${r.name}: ${r.message}`))
    
    process.exit(1)
  } else {
    console.log('✅ All tests passed! Ring Hub integration is ready for production.')
    console.log('\n🚀 You can safely enable NEXT_PUBLIC_USE_RING_HUB=true when ready.')
    process.exit(0)
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}