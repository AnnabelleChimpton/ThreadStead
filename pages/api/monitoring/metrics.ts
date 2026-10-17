/**
 * Metrics Endpoint for Monitoring
 * 
 * Provides operational metrics in a format suitable for monitoring systems.
 * Admin-only: it exposes configuration and key-rotation state.
 */

import { apiHandler } from '@/lib/api/handler'
import { getServerEnv } from '@/lib/config/env'
import { ringHubRateLimiter } from '@/lib/config/rate-limiting/limits'
import { getKeyRotationStatus } from '@/lib/utils/scheduling/key-rotation'

interface Metrics {
  timestamp: string
  uptime_seconds: number
  ring_hub: {
    requests_per_minute: number
    requests_per_hour: number
    rate_limit_allowed: boolean
    connection_attempts: number
    connection_failures: number
  }
  authentication: {
    server_key_age_days: number
    server_key_rotation_overdue: boolean
    did_document_checks: number
    did_document_failures: number
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

// Simple metrics store (in production, use Redis or similar)
const metricsStore = {
  connectionAttempts: 0,
  connectionFailures: 0,
  didDocumentChecks: 0,
  didDocumentFailures: 0
}

export default apiHandler({ methods: ['GET'], auth: 'admin' }, async (_req, res) => {
  try {
    // Get rate limiting status
    const rateLimitStatus = ringHubRateLimiter.getStatus()
    
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
      ring_hub: {
        requests_per_minute: rateLimitStatus.requestsInLastMinute,
        requests_per_hour: rateLimitStatus.requestsInLastHour,
        rate_limit_allowed: rateLimitStatus.allowed,
        connection_attempts: metricsStore.connectionAttempts,
        connection_failures: metricsStore.connectionFailures
      },
      authentication: {
        server_key_age_days: keyRotationStatus?.server.keyAge || 0,
        server_key_rotation_overdue: keyRotationStatus?.server.needsRotation || false,
        did_document_checks: metricsStore.didDocumentChecks,
        did_document_failures: metricsStore.didDocumentFailures
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

// Helper functions to update metrics (call these from other parts of the app)
export function incrementConnectionAttempts(): void {
  metricsStore.connectionAttempts++
}

export function incrementConnectionFailures(): void {
  metricsStore.connectionFailures++
}

export function incrementDIDDocumentChecks(): void {
  metricsStore.didDocumentChecks++
}

export function incrementDIDDocumentFailures(): void {
  metricsStore.didDocumentFailures++
}