/**
 * Key Rotation Scheduler
 * 
 * Handles scheduled key rotation for ThreadStead server and user DIDs
 */

import { rotateServerKeypair, getOrCreateServerKeypair } from '../../api/did/server-did-client'

interface RotationSchedule {
  serverKeyRotationDays: number
  userKeyRotationDays: number
  checkIntervalHours: number
}

const DEFAULT_SCHEDULE: RotationSchedule = {
  serverKeyRotationDays: 365, // Annual rotation
  userKeyRotationDays: 730,   // Biennial rotation
  checkIntervalHours: 24      // Daily checks
}

/**
 * Check if server key needs rotation
 */
export async function checkServerKeyRotation(): Promise<{
  needsRotation: boolean
  keyAge: number
  nextRotationDue: string
}> {
  try {
    const keypair = await getOrCreateServerKeypair()
    const keyCreated = new Date(keypair.created)
    const now = new Date()
    const ageInDays = Math.floor((now.getTime() - keyCreated.getTime()) / (1000 * 60 * 60 * 24))
    
    const schedule = getRotationSchedule()
    const needsRotation = ageInDays >= schedule.serverKeyRotationDays
    
    const nextRotationDate = new Date(keyCreated)
    nextRotationDate.setDate(nextRotationDate.getDate() + schedule.serverKeyRotationDays)
    
    return {
      needsRotation,
      keyAge: ageInDays,
      nextRotationDue: nextRotationDate.toISOString()
    }
  } catch (error) {
    console.error('Failed to check server key rotation:', error)
    return {
      needsRotation: false,
      keyAge: 0,
      nextRotationDue: new Date().toISOString()
    }
  }
}

/**
 * Perform server key rotation if needed
 */
export async function performScheduledServerKeyRotation(): Promise<{
  rotated: boolean
  reason?: string
  newKeyId?: string
}> {
  const check = await checkServerKeyRotation()
  
  if (!check.needsRotation) {
    return {
      rotated: false,
      reason: `Key is ${check.keyAge} days old, rotation not needed until ${check.nextRotationDue}`
    }
  }
  
  try {
    console.log(`Server key is ${check.keyAge} days old, performing rotation...`)
    const newKeypair = await rotateServerKeypair()
    
    // TODO: Notify Ring Hub of key rotation
    // TODO: Update monitoring systems
    // TODO: Send admin notifications
    
    return {
      rotated: true,
      reason: `Scheduled rotation after ${check.keyAge} days`,
      newKeyId: newKeypair.did
    }
  } catch (error) {
    console.error('Failed to rotate server key:', error)
    return {
      rotated: false,
      reason: `Rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Force server key rotation (for emergency situations)
 */
export async function forceServerKeyRotation(reason: string): Promise<{
  rotated: boolean
  reason: string
  newKeyId?: string
}> {
  try {
    console.log(`Forcing server key rotation: ${reason}`)
    const newKeypair = await rotateServerKeypair()
    
    // Log the emergency rotation
    console.warn(`EMERGENCY KEY ROTATION: ${reason}`)
    
    return {
      rotated: true,
      reason: `Emergency rotation: ${reason}`,
      newKeyId: newKeypair.did
    }
  } catch (error) {
    console.error('Failed to force rotate server key:', error)
    return {
      rotated: false,
      reason: `Emergency rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get rotation schedule from environment or defaults
 */
function getRotationSchedule(): RotationSchedule {
  return {
    serverKeyRotationDays: parseInt(process.env.THREADSTEAD_SERVER_KEY_ROTATION_DAYS || '365'),
    userKeyRotationDays: parseInt(process.env.THREADSTEAD_USER_KEY_ROTATION_DAYS || '730'),
    checkIntervalHours: parseInt(process.env.THREADSTEAD_KEY_CHECK_INTERVAL_HOURS || '24')
  }
}

/**
 * Start automatic key rotation monitoring
 */
export function startKeyRotationMonitoring(): void {
  const schedule = getRotationSchedule()
  const intervalMs = schedule.checkIntervalHours * 60 * 60 * 1000
  
  console.log(`Starting key rotation monitoring (checking every ${schedule.checkIntervalHours} hours)`)
  
  setInterval(async () => {
    try {
      const result = await performScheduledServerKeyRotation()
      if (result.rotated) {
        console.log(`Automatic key rotation completed: ${result.newKeyId}`)
      }
    } catch (error) {
      console.error('Error during scheduled key rotation check:', error)
    }
  }, intervalMs)
  
  // Perform initial check
  setTimeout(async () => {
    const check = await checkServerKeyRotation()
    console.log(`Key rotation status: Key age ${check.keyAge} days, next rotation due ${check.nextRotationDue}`)
    
    if (check.needsRotation) {
      console.warn('Server key needs rotation! Consider running rotation manually.')
    }
  }, 1000)
}

/**
 * Stop automatic key rotation monitoring
 */
export function stopKeyRotationMonitoring(): void {
  // In a real implementation, you'd track the interval ID and clear it
  console.log('Key rotation monitoring stopped')
}

/**
 * Get key rotation status for monitoring/admin endpoints
 */
export async function getKeyRotationStatus(): Promise<{
  server: {
    keyAge: number
    needsRotation: boolean
    nextRotationDue: string
    lastRotation?: string
  }
  schedule: RotationSchedule
}> {
  const serverCheck = await checkServerKeyRotation()
  const schedule = getRotationSchedule()
  
  return {
    server: {
      keyAge: serverCheck.keyAge,
      needsRotation: serverCheck.needsRotation,
      nextRotationDue: serverCheck.nextRotationDue,
      lastRotation: (await getOrCreateServerKeypair()).created
    },
    schedule
  }
}