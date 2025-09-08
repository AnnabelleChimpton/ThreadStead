import { reconcileThreadRingCounters } from '@/scripts/reconcile-threadring-counters'

// Simple in-memory scheduler for ThreadRing reconciliation
class ThreadRingReconciliationScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  /**
   * Start the reconciliation scheduler
   * @param intervalHours How often to run reconciliation (in hours)
   */
  start(intervalHours: number = 24) {
    if (this.intervalId) {
      console.log('⚠️ ThreadRing reconciliation scheduler already running')
      return
    }

    const intervalMs = intervalHours * 60 * 60 * 1000 // Convert hours to milliseconds

    console.log(`🕒 Starting ThreadRing reconciliation scheduler (every ${intervalHours} hours)`)

    this.intervalId = setInterval(async () => {
      await this.runReconciliation()
    }, intervalMs)

    // Run immediately on start
    this.runReconciliation()
  }

  /**
   * Stop the reconciliation scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('🛑 ThreadRing reconciliation scheduler stopped')
    }
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.intervalId !== null
  }

  /**
   * Run reconciliation manually
   */
  async runReconciliation() {
    if (this.isRunning) {
      console.log('⏳ ThreadRing reconciliation already in progress, skipping...')
      return
    }

    this.isRunning = true

    try {
      console.log('🔄 Starting scheduled ThreadRing reconciliation...')
      const result = await reconcileThreadRingCounters()
      
      if (result.corrected > 0) {
        console.log(`⚠️ ThreadRing reconciliation found and fixed ${result.corrected} counter discrepancies`)
      } else {
        console.log('✅ ThreadRing reconciliation completed - all counters accurate')
      }

      return result
    } catch (error) {
      console.error('❌ Scheduled ThreadRing reconciliation failed:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.intervalId !== null,
      reconciliationInProgress: this.isRunning
    }
  }
}

// Export singleton instance
export const threadRingReconciliationScheduler = new ThreadRingReconciliationScheduler()

// Note: Auto-start is now handled by threadring-reconciliation-bootstrap.ts
// This ensures proper initialization timing and environment checking

export default threadRingReconciliationScheduler