import { NextApiRequest, NextApiResponse } from 'next'
import { checkRingHubHealth, validateRingHubConfig, benchmarkRingHubPerformance } from '@/lib/api/ringhub/ringhub-test-utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const includeBenchmark = req.query.benchmark === 'true'
    
    // Check configuration
    const config = validateRingHubConfig()
    
    // Check health
    const health = await checkRingHubHealth()
    
    // Run benchmark if requested
    let benchmark = undefined
    if (includeBenchmark && health.ring_hub_available) {
      benchmark = await benchmarkRingHubPerformance()
    }

    const result = {
      timestamp: new Date().toISOString(),
      config,
      health,
      benchmark
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Ring Hub health check failed:', error)
    res.status(500).json({ 
      error: 'Health check failed',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}