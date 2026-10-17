/**
 * ThreadStead Monitoring Status Endpoint
 * 
 * Provides comprehensive status information for monitoring and observability.
 * Admin-only: it exposes configuration (hub URL, instance DID, key state).
 * Uptime probes should use the unauthenticated /api/monitoring/health.
 */

import { apiHandler } from '@/lib/api/handler'
import { getServerEnv } from '@/lib/config/env'
import { RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { getKeyRotationStatus } from '@/lib/utils/scheduling/key-rotation'
import { ringHubRateLimiter } from '@/lib/config/rate-limiting/limits'
import { testRingHubConnection, validateRingHubConfig } from '@/lib/api/ringhub/ringhub-test-utils'
import { getOrCreateServerKeypair } from '@/lib/api/did/server-did-client'

interface MonitoringStatus {
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  environment: string
  services: {
    ringHub: {
      available: boolean
      responseTime?: number
      error?: string
      lastChecked: string
    }
    authentication: {
      serverDid: string
      didDocumentAccessible: boolean
      keyAge: number
      keyRotationDue: string
    }
    rateLimiting: {
      ringHubRequests: {
        requestsInLastMinute: number
        requestsInLastHour: number
        allowed: boolean
      }
    }
    features: {
      ringHubEnabled: boolean
      threadRingsEnabled: boolean
      encryptionEnabled: boolean
    }
  }
  configuration: {
    ringHubUrl: string
    instanceDid: string
    environment: string
    timeouts: {
      ringHubTimeoutMs: number
    }
  }
  health: {
    issues: string[]
    warnings: string[]
  }
}

export default apiHandler({ methods: ['GET'], auth: 'admin' }, async (_req, res) => {
  const env = getServerEnv()
  const issues: string[] = []
  const warnings: string[] = []

  try {
    // Test Ring Hub connectivity
    const ringHubTest = await testRingHubConnection()
    
    // Check authentication status
    let serverKeypair
    let keyRotationStatus
    try {
      serverKeypair = await getOrCreateServerKeypair()
      keyRotationStatus = await getKeyRotationStatus()
    } catch {
      issues.push('Failed to load server keypair')
      serverKeypair = null
      keyRotationStatus = null
    }

    // Check DID document accessibility
    let didDocumentAccessible = false
    if (env.NEXT_PUBLIC_BASE_URL && serverKeypair) {
      try {
        const didDocUrl = `${env.NEXT_PUBLIC_BASE_URL}/.well-known/did.json`
        const response = await fetch(didDocUrl, { 
          signal: AbortSignal.timeout(5000) 
        })
        didDocumentAccessible = response.ok
        
        if (!didDocumentAccessible) {
          warnings.push(`DID document not accessible: ${response.status}`)
        }
      } catch {
        warnings.push('DID document accessibility check failed')
      }
    }

    // Check configuration
    const configValidation = validateRingHubConfig()
    if (!configValidation.valid) {
      issues.push(...configValidation.missing.map(m => `Missing configuration: ${m}`))
      warnings.push(...configValidation.warnings)
    }

    // Get rate limiting status
    const rateLimitStatus = ringHubRateLimiter.getStatus()

    // Check for issues that affect health status
    if (!ringHubTest.success) {
      issues.push('Ring Hub not accessible')
    }

    if (keyRotationStatus?.server.needsRotation) {
      warnings.push('Server key rotation overdue')
    }

    if (keyRotationStatus?.server.keyAge && keyRotationStatus.server.keyAge > 350) {
      warnings.push('Server key is approaching rotation deadline')
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (issues.length > 0) {
      status = 'unhealthy'
    } else if (warnings.length > 0) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    const monitoringStatus: MonitoringStatus = {
      timestamp: new Date().toISOString(),
      status,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        ringHub: {
          available: ringHubTest.success,
          responseTime: ringHubTest.responseTime,
          error: ringHubTest.error,
          lastChecked: new Date().toISOString()
        },
        authentication: {
          serverDid: serverKeypair?.did || 'not-configured',
          didDocumentAccessible,
          keyAge: keyRotationStatus?.server.keyAge || 0,
          keyRotationDue: keyRotationStatus?.server.nextRotationDue || new Date().toISOString()
        },
        rateLimiting: {
          ringHubRequests: {
            requestsInLastMinute: rateLimitStatus.requestsInLastMinute,
            requestsInLastHour: rateLimitStatus.requestsInLastHour,
            allowed: rateLimitStatus.allowed
          }
        },
        features: {
          ringHubEnabled: env.NEXT_PUBLIC_USE_RING_HUB,
          threadRingsEnabled: env.NEXT_PUBLIC_THREADRINGS_ENABLED,
          encryptionEnabled: !!env.THREADSTEAD_KEY_ENCRYPTION_KEY
        }
      },
      configuration: {
        ringHubUrl: env.RING_HUB_URL || 'not-configured',
        instanceDid: env.THREADSTEAD_DID || 'not-configured',
        environment: process.env.NODE_ENV || 'development',
        // The timeout RingHubClient actually uses (RING_HUB_TIMEOUT_MS). The
        // old RING_HUB_TIMEOUT/RETRIES/RETRY_DELAY were never read by the
        // client, which does not retry.
        timeouts: {
          ringHubTimeoutMs: RingHubClient.REQUEST_TIMEOUT_MS
        }
      },
      health: {
        issues,
        warnings
      }
    }

    // Set appropriate HTTP status code
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503

    res.status(httpStatus).json(monitoringStatus)

  } catch (error) {
    console.error('Monitoring status check failed:', error)
    
    const errorStatus: MonitoringStatus = {
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        ringHub: {
          available: false,
          error: 'Status check failed',
          lastChecked: new Date().toISOString()
        },
        authentication: {
          serverDid: 'unknown',
          didDocumentAccessible: false,
          keyAge: 0,
          keyRotationDue: new Date().toISOString()
        },
        rateLimiting: {
          ringHubRequests: {
            requestsInLastMinute: 0,
            requestsInLastHour: 0,
            allowed: true
          }
        },
        features: {
          ringHubEnabled: false,
          threadRingsEnabled: false,
          encryptionEnabled: false
        }
      },
      configuration: {
        ringHubUrl: 'unknown',
        instanceDid: 'unknown',
        environment: process.env.NODE_ENV || 'development',
        timeouts: {
          ringHubTimeoutMs: 0
        }
      },
      health: {
        issues: ['Status check failed'],
        warnings: []
      }
    }

    res.status(503).json(errorStatus)
  }
})
