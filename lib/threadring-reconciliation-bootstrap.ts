/**
 * Bootstrap file to ensure ThreadRing reconciliation scheduler starts properly
 * This should be imported in _app.tsx or similar to ensure scheduler initialization
 */

import { threadRingReconciliationScheduler } from './threadring-reconciliation-scheduler'

let bootstrapped = false

export function bootstrapThreadRingReconciliation() {
  if (bootstrapped) {
    return // Already initialized
  }

  // Only run on server-side
  if (typeof window !== 'undefined') {
    return // Skip on client-side
  }

  // Only run in production unless explicitly enabled
  const isProduction = process.env.NODE_ENV === 'production'
  const forceEnable = process.env.FORCE_THREADRING_RECONCILIATION === 'true'
  
  if (!isProduction && !forceEnable) {
    console.log('🔄 ThreadRing reconciliation scheduler: Disabled in development')
    return
  }

  // Check if disabled
  if (process.env.DISABLE_THREADRING_RECONCILIATION === 'true') {
    console.log('🔄 ThreadRing reconciliation scheduler: Disabled by environment variable')
    return
  }

  try {
    const intervalHours = parseInt(process.env.THREADRING_RECONCILIATION_HOURS || '24')
    
    // Validate interval
    if (intervalHours < 1 || intervalHours > 168) {
      console.error('⚠️ Invalid THREADRING_RECONCILIATION_HOURS, using default 24 hours')
      threadRingReconciliationScheduler.start(24)
    } else {
      threadRingReconciliationScheduler.start(intervalHours)
    }

    console.log(`✅ ThreadRing reconciliation scheduler started (${intervalHours}h interval)`)
    bootstrapped = true
    
  } catch (error) {
    console.error('❌ Failed to start ThreadRing reconciliation scheduler:', error)
  }
}

// Auto-bootstrap if this module is imported
bootstrapThreadRingReconciliation()

export default bootstrapThreadRingReconciliation