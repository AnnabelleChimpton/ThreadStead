/**
 * RingHub Profile Synchronization
 *
 * Handles notifying RingHub when user profile data changes.
 * RingHub will re-resolve the DID document to get updated data.
 */

import { getOrCreateUserDID } from '@/lib/api/did/server-did-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'

/**
 * Notify RingHub that a user's profile has changed
 *
 * RingHub will re-resolve the DID document to get updated profile data.
 * This is called when:
 * - Display name changes
 * - Avatar changes
 * - Profile visibility changes (to/from public)
 * - Handle changes
 *
 * @param userId - ThreadStead user ID
 * @returns Promise that resolves when notification sent (or fails silently)
 */
export async function notifyRingHubProfileUpdate(userId: string): Promise<void> {
  try {
    // Get user's DID
    const userDID = await getOrCreateUserDID(userId)

    // Create authenticated RingHub client for this user
    const client = await createAuthenticatedRingHubClient(userId)

    // Notify RingHub of profile update
    // NOTE: This endpoint must be implemented by RingHub team
    // Expected: POST /trp/actors/{did}/profile-updated
    await client.notifyProfileUpdate(userDID.did)
  } catch (error) {
    // Log error but don't throw - profile sync is non-critical
    // The system should continue to work even if RingHub is unavailable
    console.error('Failed to notify RingHub of profile update:', error)
  }
}

/**
 * Check if user participates in any federated ThreadRings
 *
 * Only notify RingHub if user is actually a member of rings.
 * This avoids unnecessary API calls for users not in federated rings.
 *
 * @param userId - ThreadStead user ID
 * @param db - Prisma database client
 * @returns True if user should trigger RingHub notifications
 */
export async function shouldNotifyRingHub(userId: string, db: any): Promise<boolean> {
  try {
    // Check if user is member of any ThreadRings
    const ringMembership = await db.threadRingMember.findFirst({
      where: { userId },
      select: { id: true }
    })

    return !!ringMembership
  } catch (error) {
    console.error('Error checking ring membership:', error)
    // On error, assume we should notify (safe default)
    return true
  }
}

/**
 * Notify RingHub of profile update if user is in any rings
 *
 * Convenience function that combines the membership check and notification.
 * Use this in API endpoints that update profile data.
 *
 * @param userId - ThreadStead user ID
 * @param db - Prisma database client
 */
export async function notifyRingHubIfMember(userId: string, db: any): Promise<void> {
  if (await shouldNotifyRingHub(userId, db)) {
    // Fire-and-forget notification (don't await or block)
    notifyRingHubProfileUpdate(userId).catch(err => {
      console.error('Profile update notification failed:', err)
    })
  }
}
