import { db } from '@/lib/config/database/connection'

export interface BlockCheckResult {
  isBlocked: boolean
  blockType?: 'user' | 'instance' | 'actor'
  blockId?: string
  reason?: string
}

/**
 * Check if a user is blocked from a ThreadRing
 */
export async function isUserBlockedFromThreadRing(
  threadRingId: string,
  userId: string,
  userActorUri?: string
): Promise<BlockCheckResult> {
  try {
    // Check for direct user block
    const userBlock = await db.threadRingBlock.findFirst({
      where: {
        threadRingId,
        blockType: 'user',
        blockedUserId: userId
      },
      select: {
        id: true,
        blockType: true,
        reason: true
      }
    })

    if (userBlock) {
      return {
        isBlocked: true,
        blockType: 'user',
        blockId: userBlock.id,
        reason: userBlock.reason || undefined
      }
    }

    // Check for actor URI block (federated users)
    if (userActorUri) {
      const actorBlock = await db.threadRingBlock.findFirst({
        where: {
          threadRingId,
          blockType: 'actor',
          blockedActorUri: userActorUri
        },
        select: {
          id: true,
          blockType: true,
          reason: true
        }
      })

      if (actorBlock) {
        return {
          isBlocked: true,
          blockType: 'actor',
          blockId: actorBlock.id,
          reason: actorBlock.reason || undefined
        }
      }
    }

    // Check for instance block (if user is from a federated instance)
    if (userActorUri) {
      try {
        const instanceDomain = new URL(userActorUri).hostname
        const instanceBlock = await db.threadRingBlock.findFirst({
          where: {
            threadRingId,
            blockType: 'instance',
            blockedInstance: instanceDomain
          },
          select: {
            id: true,
            blockType: true,
            reason: true
          }
        })

        if (instanceBlock) {
          return {
            isBlocked: true,
            blockType: 'instance',
            blockId: instanceBlock.id,
            reason: instanceBlock.reason || undefined
          }
        }
      } catch (error) {
        // Invalid URL, ignore instance check
        console.warn('Invalid actor URI for instance check:', userActorUri)
      }
    }

    return { isBlocked: false }
  } catch (error) {
    console.error('Error checking user block status:', error)
    // On error, assume not blocked (fail open for availability)
    return { isBlocked: false }
  }
}

/**
 * Check if an instance is blocked from a ThreadRing
 */
export async function isInstanceBlockedFromThreadRing(
  threadRingId: string,
  instanceDomain: string
): Promise<BlockCheckResult> {
  try {
    const instanceBlock = await db.threadRingBlock.findFirst({
      where: {
        threadRingId,
        blockType: 'instance',
        blockedInstance: instanceDomain
      },
      select: {
        id: true,
        blockType: true,
        reason: true
      }
    })

    if (instanceBlock) {
      return {
        isBlocked: true,
        blockType: 'instance',
        blockId: instanceBlock.id,
        reason: instanceBlock.reason || undefined
      }
    }

    return { isBlocked: false }
  } catch (error) {
    console.error('Error checking instance block status:', error)
    return { isBlocked: false }
  }
}

/**
 * Batch check if multiple users are blocked from a ThreadRing
 * Useful for filtering member lists or post feeds
 */
export async function filterBlockedUsers(
  threadRingId: string,
  userIds: string[]
): Promise<string[]> {
  try {
    const blockedUserIds = await db.threadRingBlock.findMany({
      where: {
        threadRingId,
        blockType: 'user',
        blockedUserId: { in: userIds }
      },
      select: { blockedUserId: true }
    })

    const blockedIds = blockedUserIds
      .map(block => block.blockedUserId)
      .filter(Boolean) as string[]

    return userIds.filter(userId => !blockedIds.includes(userId))
  } catch (error) {
    console.error('Error filtering blocked users:', error)
    // On error, return all users (fail open)
    return userIds
  }
}

/**
 * Get all blocked entities for a ThreadRing (for management UI)
 */
export async function getThreadRingBlocks(threadRingId: string) {
  try {
    return await db.threadRingBlock.findMany({
      where: { threadRingId },
      include: {
        blockedUser: {
          select: {
            id: true,
            handles: {
              take: 1,
              select: { handle: true }
            },
            profile: {
              select: { displayName: true }
            }
          }
        },
        createdByUser: {
          select: {
            id: true,
            handles: {
              take: 1,
              select: { handle: true }
            },
            profile: {
              select: { displayName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error('Error fetching ThreadRing blocks:', error)
    throw error
  }
}

/**
 * Helper to get user display name for block management
 */
export function getUserDisplayName(user: {
  handles: Array<{ handle: string }>
  profile: { displayName: string | null } | null
}) {
  return user.profile?.displayName || user.handles[0]?.handle || 'Unknown User'
}