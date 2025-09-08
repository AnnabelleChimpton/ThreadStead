/**
 * Rate Limiting Configuration for ThreadStead
 * 
 * Configures rate limiting for various operations including Ring Hub API calls
 */

export interface RateLimitConfig {
  ringHubApi: {
    requestsPerMinute: number
    requestsPerHour: number
    burstLimit: number
  }
  didOperations: {
    creationsPerHour: number
    rotationsPerDay: number
  }
  webhooks: {
    requestsPerMinute: number
    maxPayloadSize: number
  }
  userOperations: {
    joinRequestsPerHour: number
    postSubmissionsPerMinute: number
    searchRequestsPerMinute: number
  }
}

/**
 * Get rate limiting configuration from environment or defaults
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    ringHubApi: {
      requestsPerMinute: parseInt(process.env.RING_HUB_RATE_LIMIT_PER_MINUTE || '60'),
      requestsPerHour: parseInt(process.env.RING_HUB_RATE_LIMIT_PER_HOUR || '1800'),
      burstLimit: parseInt(process.env.RING_HUB_BURST_LIMIT || '10')
    },
    didOperations: {
      creationsPerHour: parseInt(process.env.DID_CREATIONS_PER_HOUR || '100'),
      rotationsPerDay: parseInt(process.env.DID_ROTATIONS_PER_DAY || '5')
    },
    webhooks: {
      requestsPerMinute: parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_MINUTE || '30'),
      maxPayloadSize: parseInt(process.env.WEBHOOK_MAX_PAYLOAD_SIZE || '1048576') // 1MB
    },
    userOperations: {
      joinRequestsPerHour: parseInt(process.env.USER_JOIN_REQUESTS_PER_HOUR || '20'),
      postSubmissionsPerMinute: parseInt(process.env.USER_POST_SUBMISSIONS_PER_MINUTE || '10'),
      searchRequestsPerMinute: parseInt(process.env.USER_SEARCH_REQUESTS_PER_MINUTE || '30')
    }
  }
}

/**
 * Ring Hub API rate limiter
 */
export class RingHubRateLimiter {
  private requestTimes: number[] = []
  private config: RateLimitConfig['ringHubApi']

  constructor(config?: Partial<RateLimitConfig['ringHubApi']>) {
    const fullConfig = getRateLimitConfig().ringHubApi
    this.config = { ...fullConfig, ...config }
  }

  /**
   * Check if request is allowed under rate limits
   */
  isRequestAllowed(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000

    // Remove old requests
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo)

    // Check per-minute limit
    const recentRequests = this.requestTimes.filter(time => time > oneMinuteAgo)
    if (recentRequests.length >= this.config.requestsPerMinute) {
      return false
    }

    // Check per-hour limit
    if (this.requestTimes.length >= this.config.requestsPerHour) {
      return false
    }

    // Check burst limit (last 10 seconds)
    const tenSecondsAgo = now - 10 * 1000
    const burstRequests = this.requestTimes.filter(time => time > tenSecondsAgo)
    if (burstRequests.length >= this.config.burstLimit) {
      return false
    }

    return true
  }

  /**
   * Record a request (call this when making a request)
   */
  recordRequest(): void {
    this.requestTimes.push(Date.now())
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    allowed: boolean
    requestsInLastMinute: number
    requestsInLastHour: number
    nextRequestAllowedAt?: number
  } {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000

    // Clean up old requests
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo)

    const recentRequests = this.requestTimes.filter(time => time > oneMinuteAgo)
    const allowed = this.isRequestAllowed()

    let nextRequestAllowedAt: number | undefined

    if (!allowed) {
      // Calculate when next request will be allowed
      if (recentRequests.length >= this.config.requestsPerMinute) {
        // Wait for oldest request in last minute to expire
        nextRequestAllowedAt = Math.min(...recentRequests) + 60 * 1000
      } else if (this.requestTimes.length >= this.config.requestsPerHour) {
        // Wait for oldest request in last hour to expire
        nextRequestAllowedAt = Math.min(...this.requestTimes) + 60 * 60 * 1000
      }
    }

    return {
      allowed,
      requestsInLastMinute: recentRequests.length,
      requestsInLastHour: this.requestTimes.length,
      nextRequestAllowedAt
    }
  }
}

/**
 * User operation rate limiter
 */
export class UserOperationRateLimiter {
  private userRequests = new Map<string, number[]>()
  private config: RateLimitConfig['userOperations']

  constructor(config?: Partial<RateLimitConfig['userOperations']>) {
    const fullConfig = getRateLimitConfig().userOperations
    this.config = { ...fullConfig, ...config }
  }

  /**
   * Check if user operation is allowed
   */
  isOperationAllowed(userId: string, operation: keyof RateLimitConfig['userOperations']): boolean {
    const now = Date.now()
    const userRequestTimes = this.userRequests.get(userId) || []

    let timeWindow: number
    let limit: number

    switch (operation) {
      case 'joinRequestsPerHour':
        timeWindow = 60 * 60 * 1000 // 1 hour
        limit = this.config.joinRequestsPerHour
        break
      case 'postSubmissionsPerMinute':
        timeWindow = 60 * 1000 // 1 minute
        limit = this.config.postSubmissionsPerMinute
        break
      case 'searchRequestsPerMinute':
        timeWindow = 60 * 1000 // 1 minute
        limit = this.config.searchRequestsPerMinute
        break
      default:
        return false
    }

    const windowStart = now - timeWindow
    const recentRequests = userRequestTimes.filter(time => time > windowStart)

    return recentRequests.length < limit
  }

  /**
   * Record a user operation
   */
  recordOperation(userId: string): void {
    const userRequestTimes = this.userRequests.get(userId) || []
    userRequestTimes.push(Date.now())

    // Keep only last 24 hours of requests
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const filteredTimes = userRequestTimes.filter(time => time > oneDayAgo)

    this.userRequests.set(userId, filteredTimes)
  }

  /**
   * Clean up old request records
   */
  cleanup(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    for (const [userId, requestTimes] of this.userRequests.entries()) {
      const filteredTimes = requestTimes.filter(time => time > oneDayAgo)
      
      if (filteredTimes.length === 0) {
        this.userRequests.delete(userId)
      } else {
        this.userRequests.set(userId, filteredTimes)
      }
    }
  }
}

/**
 * Global rate limiters (singletons)
 */
export const ringHubRateLimiter = new RingHubRateLimiter()
export const userOperationRateLimiter = new UserOperationRateLimiter()

/**
 * Middleware for rate limiting Ring Hub API calls
 */
export function withRingHubRateLimit<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const status = ringHubRateLimiter.getStatus()
    
    if (!status.allowed) {
      const waitTime = status.nextRequestAllowedAt ? status.nextRequestAllowedAt - Date.now() : 1000
      throw new Error(`Rate limit exceeded. Retry after ${Math.ceil(waitTime / 1000)} seconds`)
    }

    ringHubRateLimiter.recordRequest()
    return fn(...args)
  }
}

/**
 * Middleware for rate limiting user operations
 */
export function withUserOperationRateLimit<T extends any[], R>(
  operation: keyof RateLimitConfig['userOperations']
) {
  return function (fn: (userId: string, ...args: T) => Promise<R>) {
    return async (userId: string, ...args: T): Promise<R> => {
      if (!userOperationRateLimiter.isOperationAllowed(userId, operation)) {
        throw new Error(`Rate limit exceeded for ${operation}. Please wait before trying again.`)
      }

      userOperationRateLimiter.recordOperation(userId)
      return fn(userId, ...args)
    }
  }
}

/**
 * Start cleanup interval for rate limiters
 */
export function startRateLimitCleanup(): void {
  // Clean up user operation records every hour
  setInterval(() => {
    userOperationRateLimiter.cleanup()
  }, 60 * 60 * 1000)
}