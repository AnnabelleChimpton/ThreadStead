/**
 * Ring Hub Testing Utilities
 * 
 * Utilities for testing Ring Hub connectivity and client functionality
 */

import { getRingHubClient, RingHubClient, RingHubClientError } from '@/lib/ringhub-client'

export interface ConnectionTestResult {
  success: boolean
  error?: string
  responseTime?: number
  endpoint?: string
}

export interface HealthCheckResult {
  ring_hub_available: boolean
  response_time?: number
  error?: string
  authenticated?: boolean
}

/**
 * Test basic Ring Hub connectivity
 */
export async function testRingHubConnection(): Promise<ConnectionTestResult> {
  const client = getRingHubClient()
  
  if (!client) {
    return {
      success: false,
      error: 'Ring Hub client not configured'
    }
  }

  const startTime = Date.now()
  
  try {
    // Test basic connectivity with a simple health check
    const response = await fetch(`${process.env.RING_HUB_URL}/health`)
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
        endpoint: '/health'
      }
    }

    return {
      success: true,
      responseTime,
      endpoint: '/health'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
      endpoint: '/health'
    }
  }
}

/**
 * Test Ring Hub API endpoints
 */
export async function testRingHubAPI(): Promise<ConnectionTestResult> {
  const client = getRingHubClient()
  
  if (!client) {
    return {
      success: false,
      error: 'Ring Hub client not configured'
    }
  }

  const startTime = Date.now()
  
  try {
    // Test the rings listing endpoint
    await client.listRings({ limit: 1 })
    
    return {
      success: true,
      responseTime: Date.now() - startTime,
      endpoint: '/trp/rings'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
      endpoint: '/trp/rings'
    }
  }
}

/**
 * Test Ring Hub authentication
 */
export async function testRingHubAuth(): Promise<ConnectionTestResult> {
  const client = getRingHubClient()
  
  if (!client) {
    return {
      success: false,
      error: 'Ring Hub client not configured'
    }
  }

  const startTime = Date.now()
  
  try {
    // Try to create a test ring to verify authentication
    const testRing = {
      name: 'Connection Test Ring',
      slug: `test-ring-${Date.now()}`,
      description: 'Temporary ring for testing Ring Hub connection',
      visibility: 'PRIVATE' as const,
      joinPolicy: 'CLOSED' as const,
      postPolicy: 'CLOSED' as const
    }
    
    await client.forkRing('spool', testRing)
    
    // Clean up by deleting the test ring
    try {
      await client.deleteRing(testRing.slug)
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      success: true,
      responseTime: Date.now() - startTime,
      endpoint: '/trp/rings (authenticated)'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
      endpoint: '/trp/rings (authenticated)'
    }
  }
}

/**
 * Comprehensive Ring Hub health check
 */
export async function checkRingHubHealth(): Promise<HealthCheckResult> {
  const connectionTest = await testRingHubConnection()
  
  if (!connectionTest.success) {
    return {
      ring_hub_available: false,
      error: connectionTest.error
    }
  }

  const apiTest = await testRingHubAPI()
  
  if (!apiTest.success) {
    return {
      ring_hub_available: true,
      response_time: connectionTest.responseTime,
      error: `API test failed: ${apiTest.error}`,
      authenticated: false
    }
  }

  const authTest = await testRingHubAuth()
  
  return {
    ring_hub_available: true,
    response_time: connectionTest.responseTime,
    authenticated: authTest.success,
    error: authTest.success ? undefined : `Auth test failed: ${authTest.error}`
  }
}

/**
 * Test Ring Hub client configuration
 */
export function validateRingHubConfig(): {
  valid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []

  if (!process.env.RING_HUB_URL) {
    missing.push('RING_HUB_URL')
  }

  if (!process.env.THREADSTEAD_DID) {
    missing.push('THREADSTEAD_DID')
  }

  if (!process.env.RING_HUB_API_KEY) {
    warnings.push('RING_HUB_API_KEY not set (authentication may fail)')
  }

  if (process.env.NEXT_PUBLIC_USE_RING_HUB !== 'true') {
    warnings.push('NEXT_PUBLIC_USE_RING_HUB is not enabled')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Create a Ring Hub client for testing with custom configuration
 */
export function createTestRingHubClient(overrides: {
  baseUrl?: string
  instanceDID?: string
  apiKey?: string
} = {}): RingHubClient | null {
  const baseUrl = overrides.baseUrl || process.env.RING_HUB_URL
  const instanceDID = overrides.instanceDID || process.env.THREADSTEAD_DID
  const apiKey = overrides.apiKey || process.env.RING_HUB_API_KEY

  if (!baseUrl || !instanceDID) {
    return null
  }

  return new RingHubClient({
    baseUrl,
    instanceDID,
    privateKeyBase64Url: 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g',
    publicKeyMultibase: 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj'
  })
}

/**
 * Performance benchmark for Ring Hub operations
 */
export async function benchmarkRingHubPerformance(): Promise<{
  operations: {
    name: string
    duration: number
    success: boolean
    error?: string
  }[]
  summary: {
    total_operations: number
    successful_operations: number
    average_response_time: number
    total_time: number
  }
}> {
  const client = getRingHubClient()
  const operations: any[] = []
  
  if (!client) {
    return {
      operations: [{
        name: 'client_init',
        duration: 0,
        success: false,
        error: 'Ring Hub client not configured'
      }],
      summary: {
        total_operations: 1,
        successful_operations: 0,
        average_response_time: 0,
        total_time: 0
      }
    }
  }

  const benchmarkOperations = [
    {
      name: 'list_rings',
      operation: () => client.listRings({ limit: 10 })
    },
    {
      name: 'get_nonexistent_ring',
      operation: () => client.getRing('nonexistent-ring-test')
    },
    {
      name: 'list_rings_search',
      operation: () => client.listRings({ search: 'test', limit: 5 })
    }
  ]

  const startTime = Date.now()

  for (const { name, operation } of benchmarkOperations) {
    const opStartTime = Date.now()
    
    try {
      await operation()
      operations.push({
        name,
        duration: Date.now() - opStartTime,
        success: true
      })
    } catch (error) {
      operations.push({
        name,
        duration: Date.now() - opStartTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const totalTime = Date.now() - startTime
  const successfulOps = operations.filter(op => op.success)
  
  return {
    operations,
    summary: {
      total_operations: operations.length,
      successful_operations: successfulOps.length,
      average_response_time: successfulOps.length > 0 
        ? successfulOps.reduce((sum, op) => sum + op.duration, 0) / successfulOps.length 
        : 0,
      total_time: totalTime
    }
  }
}