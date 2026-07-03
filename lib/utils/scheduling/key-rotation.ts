/**
 * Key Rotation Scheduler
 * 
 * Handles scheduled key rotation for ThreadStead server and user DIDs
 */

import { getOrCreateServerKeypair } from '../../api/did/server-did-client'

/**
 * Server key rotation is NOT IMPLEMENTED and is intentionally guarded.
 *
 * The previous implementation called rotateServerKeypair(), which just rewrote the
 * local keypair file. That would SILENTLY BREAK Ring Hub authentication because it:
 *   - never publishes the new key alongside the old one during a transition window,
 *   - never notifies the hub of the new key,
 *   - never atomically swaps the signing key env (THREADSTEAD_PRIVATE_KEY_B64URL) used
 *     by RingHubClient.fromEnvironment — so signing and the published DID doc diverge.
 *
 * A correct rotation protocol requires: publish-new-alongside-old -> hub notify /
 * re-register the new key -> wait for propagation -> atomic signing-key swap ->
 * retire the old key. Until that exists, rotation must not be wired up.
 */
function serverKeyRotationNotImplemented(): never {
  throw new Error(
    'Server key rotation is not implemented. Rotating the server key without the full ' +
    'protocol (publish-new-alongside-old + hub notify + atomic signing-key swap) would ' +
    'break Ring Hub authentication and lock the instance out of the hub. See key-rotation.ts.'
  )
}

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
  // GUARDED: server key rotation is not implemented (see serverKeyRotationNotImplemented).
  // We still surface the age check so monitoring can warn, but never actually rotate.
  const check = await checkServerKeyRotation()

  if (!check.needsRotation) {
    return {
      rotated: false,
      reason: `Key is ${check.keyAge} days old, rotation not needed until ${check.nextRotationDue}`
    }
  }

  serverKeyRotationNotImplemented()
}

/**
 * Force server key rotation (for emergency situations)
 */
export async function forceServerKeyRotation(reason: string): Promise<{
  rotated: boolean
  reason: string
  newKeyId?: string
}> {
  // GUARDED: emergency rotation would also silently break auth without the full protocol.
  console.warn(`Requested emergency server key rotation (${reason}) — blocked, not implemented.`)
  serverKeyRotationNotImplemented()
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
  // GUARDED: this would set up an interval that calls the (unimplemented) rotation path.
  // Wiring it up would eventually attempt a rotation that breaks Ring Hub auth. It has no
  // callers today; keep it that way until a real rotation protocol exists.
  serverKeyRotationNotImplemented()
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