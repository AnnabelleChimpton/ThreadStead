import { NextApiRequest, NextApiResponse } from 'next'
import { withRingHubFeature } from '@/lib/ringhub-middleware'
import { getRingHubClient } from '@/lib/ringhub-client'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const client = getRingHubClient()
  
  if (!client) {
    return res.status(500).json({ 
      error: 'Ring Hub client not available',
      config_check: {
        ring_hub_url: !!process.env.RING_HUB_URL,
        threadstead_did: !!process.env.THREADSTEAD_DID,
        feature_enabled: process.env.NEXT_PUBLIC_USE_RING_HUB === 'true'
      }
    })
  }

  try {
    // Test basic client operations
    const tests = []

    // Test 1: List rings (should work even if service is down - will show error handling)
    try {
      const rings = await client.listRings({ limit: 5 })
      tests.push({
        name: 'list_rings',
        success: true,
        result: `Found ${rings.total} rings`
      })
    } catch (error) {
      tests.push({
        name: 'list_rings',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 2: Try to get a specific ring
    try {
      const ring = await client.getRing('test-ring')
      tests.push({
        name: 'get_ring',
        success: true,
        result: ring ? 'Ring found' : 'Ring not found (expected)'
      })
    } catch (error) {
      tests.push({
        name: 'get_ring',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    return res.status(200).json({
      message: 'Ring Hub client integration test',
      client_available: true,
      tests,
      summary: {
        total_tests: tests.length,
        passed: tests.filter(t => t.success).length,
        failed: tests.filter(t => !t.success).length
      }
    })

  } catch (error) {
    return res.status(500).json({
      error: 'Integration test failed',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}

export default withRingHubFeature(handler)