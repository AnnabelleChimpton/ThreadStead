/**
 * Metrics Endpoint for Monitoring
 * 
 * Provides operational metrics in a format suitable for monitoring systems.
 * Admin-only: it exposes configuration and key-rotation state.
 */

import { apiHandler } from '@/lib/api/handler'
import { getServerEnv } from '@/lib/config/env'
import { getRateLimitStats } from '@/lib/server/http/rate-limit'
import { getKeyRotationStatus } from '@/lib/utils/scheduling/key-rotation'

interface Metrics {
  timestamp: string
  uptime_seconds: number
  /** API rate limits per category, live from the RateLimit table. */
  rate_limits: Record<string, {
    limit: number
    window_seconds: number
    active_callers: number
    limited_callers: number
  }>
  authentication: {
    server_key_age_days: number
    server_key_rotation_overdue: boolean
  }
  features: {
    ring_hub_enabled: boolean
    threadrings_enabled: boolean
    encryption_enabled: boolean
  }
  performance: {
    memory_usage_mb: number
    cpu_usage_percent: number
  }
}

export default apiHandler({ methods: ['GET'], auth: 'admin' }, async (_req, res) => {
  try {
    const rateLimits = await getRateLimitStats()
    
    // Get key rotation status
    let keyRotationStatus
    try {
      keyRotationStatus = await getKeyRotationStatus()
    } catch {
      keyRotationStatus = null
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)

    // CPU usage is more complex to calculate, simplified here
    const cpuUsage = process.cpuUsage()
    const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000) // Simplified

    const env = getServerEnv()
    const metrics: Metrics = {
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      rate_limits: Object.fromEntries(
        Object.entries(rateLimits).map(([category, r]) => [category, {
          limit: r.limit,
          window_seconds: r.windowSeconds,
          active_callers: r.activeCallers,
          limited_callers: r.limitedCallers
        }])
      ),
      authentication: {
        server_key_age_days: keyRotationStatus?.server.keyAge || 0,
        server_key_rotation_overdue: keyRotationStatus?.server.needsRotation || false
      },
      features: {
        ring_hub_enabled: env.NEXT_PUBLIC_USE_RING_HUB,
        threadrings_enabled: env.NEXT_PUBLIC_THREADRINGS_ENABLED,
        encryption_enabled: !!env.THREADSTEAD_KEY_ENCRYPTION_KEY
      },
      performance: {
        memory_usage_mb: memoryUsageMB,
        cpu_usage_percent: cpuPercent
      }
    }

    // Set headers for metrics scraping
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    
    res.status(200).json(metrics)

  } catch (error) {
    console.error('Metrics collection failed:', error)
    res.status(500).json({ error: 'Failed to collect metrics' })
  }
})

