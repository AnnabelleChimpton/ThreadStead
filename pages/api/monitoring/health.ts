/**
 * Simple Health Check Endpoint
 *
 * Lightweight, unauthenticated health check for load balancers and uptime
 * probes. It deliberately exposes nothing about configuration — the detailed
 * /api/monitoring/status and /metrics endpoints are admin-only.
 */

import { apiHandler } from '@/lib/api/handler'

interface HealthResponse {
  status: 'ok'
  timestamp: string
  uptime: number
  version: string
}

export default apiHandler({ methods: ['GET'], auth: 'none' }, async (_req, res) => {
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
})
