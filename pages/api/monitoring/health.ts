/**
 * Simple Health Check Endpoint
 * 
 * Lightweight health check for load balancers and monitoring systems
 */

import { NextApiRequest, NextApiResponse } from 'next'

interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  uptime: number
  version: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0'
    })
  }

  try {
    const health: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    }

    // Set cache headers to prevent caching of health checks
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    res.status(200).json(health)
  } catch (error) {
    console.error('Health check failed:', error)
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    })
  }
}