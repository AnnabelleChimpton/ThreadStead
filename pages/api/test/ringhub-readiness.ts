/**
 * Ring Hub Readiness Test API Endpoint
 * 
 * Provides a web endpoint to test Ring Hub connectivity and authentication
 * without enabling ThreadRing features or making write operations.
 * 
 * Access via: /api/test/ringhub-readiness
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { 
  testRingHubConnection, 
  testRingHubAPI, 
  checkRingHubHealth,
  validateRingHubConfig
} from '@/lib/ringhub-test-utils'
import { getRingHubClient } from '@/lib/ringhub-client'
import { generateDIDDocument, getServerDID } from '@/lib/server-did-client'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
  duration?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results: TestResult[] = []
  const startTime = Date.now()

  async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const testStartTime = Date.now()
    try {
      const result = await testFn()
      const duration = Date.now() - testStartTime
      results.push({
        name,
        status: 'PASS',
        message: 'Test passed',
        details: result,
        duration
      })
    } catch (error) {
      const duration = Date.now() - testStartTime
      results.push({
        name,
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        duration
      })
    }
  }

  try {
    // Test 1: Environment Configuration
    await runTest('Environment Configuration', async () => {
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
    })

    // Test 2: DID Document Generation
    await runTest('DID Document Generation', async () => {
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
    })

    // Test 3: Ring Hub Connectivity
    await runTest('Ring Hub Basic Connectivity', async () => {
      const result = await testRingHubConnection()
      
      if (!result.success) {
        throw new Error(result.error || 'Connection failed')
      }
      
      return {
        success: result.success,
        responseTime: result.responseTime,
        endpoint: result.endpoint
      }
    })

    // Test 4: Ring Hub API Access
    await runTest('Ring Hub API Access', async () => {
      const result = await testRingHubAPI()
      
      if (!result.success) {
        throw new Error(result.error || 'API access failed')
      }
      
      return {
        success: result.success,
        responseTime: result.responseTime,
        endpoint: result.endpoint
      }
    })

    // Test 5: Ring Hub Read Operations
    await runTest('Ring Hub Read Operations', async () => {
      const client = getRingHubClient()
      
      if (!client) {
        throw new Error('Ring Hub client not available')
      }
      
      // Test listing rings (read operation)
      const listResult = await client.listRings({ limit: 3 })
      
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
          sampleRings: listResult.rings?.slice(0, 2).map(r => ({ slug: r.slug, name: r.name }))
        },
        getRing: getRingResult ? {
          slug: getRingResult.slug,
          name: getRingResult.name,
          memberCount: getRingResult.memberCount,
          visibility: getRingResult.visibility
        } : 'No rings available for testing'
      }
    })

    // Test 6: Ring Hub Authentication
    await runTest('Ring Hub Authentication', async () => {
      const client = getRingHubClient()
      
      if (!client) {
        throw new Error('Ring Hub client not available')
      }
      
      try {
        // Try a simple authenticated request
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
    })

    // Test 7: Ring Hub Health Check
    await runTest('Ring Hub Health Check', async () => {
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
    })

    const totalDuration = Date.now() - startTime
    const passed = results.filter(r => r.status === 'PASS').length
    const failed = results.filter(r => r.status === 'FAIL').length

    return res.status(200).json({
      success: failed === 0,
      summary: {
        total: results.length,
        passed,
        failed,
        skipped: results.filter(r => r.status === 'SKIP').length,
        duration: totalDuration
      },
      results,
      message: failed === 0 
        ? 'All tests passed! Ring Hub integration is ready for production.'
        : `${failed} test(s) failed. Ring Hub integration may not be ready.`,
      readyForProduction: failed === 0,
      nextSteps: failed === 0 
        ? ['You can safely enable NEXT_PUBLIC_USE_RING_HUB=true when ready']
        : ['Fix the failing tests before enabling Ring Hub integration']
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Test runner failed',
      message: error instanceof Error ? error.message : String(error),
      results
    })
  }
}