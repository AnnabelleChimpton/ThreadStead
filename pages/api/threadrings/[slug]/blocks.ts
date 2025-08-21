import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { SITE_NAME } from '@/lib/site-config'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  const viewer = await getSessionUser(req)
  if (!viewer) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Find the ThreadRing
  const threadRing = await db.threadRing.findUnique({
    where: { slug },
    select: { 
      id: true,
      curatorId: true
    }
  })

  if (!threadRing) {
    return res.status(404).json({ error: 'ThreadRing not found' })
  }

  // Check if user is curator or moderator
  const member = await db.threadRingMember.findFirst({
    where: {
      threadRingId: threadRing.id,
      userId: viewer.id,
      role: { in: ['curator', 'moderator'] }
    }
  })

  if (!member) {
    return res.status(403).json({ error: 'Only curators and moderators can manage blocks' })
  }

  if (req.method === 'GET') {
    // List all blocks for this ThreadRing
    try {
      const blocks = await db.threadRingBlock.findMany({
        where: { threadRingId: threadRing.id },
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

      return res.status(200).json({ blocks })
    } catch (error) {
      console.error('Error fetching blocks:', error)
      return res.status(500).json({ error: 'Failed to fetch blocks' })
    }
  }

  if (req.method === 'POST') {
    // Create a new block
    const { blockType, userId, instance, actorUri, reason } = req.body

    if (!blockType || !['user', 'instance', 'actor'].includes(blockType)) {
      return res.status(400).json({ error: 'Valid blockType is required (user, instance, or actor)' })
    }

    // Validate block target based on type
    if (blockType === 'user' && !userId) {
      return res.status(400).json({ error: 'userId is required for user blocks' })
    }
    if (blockType === 'instance' && !instance) {
      return res.status(400).json({ error: 'instance domain is required for instance blocks' })
    }
    if (blockType === 'actor' && !actorUri) {
      return res.status(400).json({ error: 'actorUri is required for actor blocks' })
    }

    try {
      let resolvedUserId = userId
      let targetUser = null

      // Validate user exists if blocking a user - handle both user ID and username/handle
      if (blockType === 'user') {
        // First try to find by ID (if it looks like a user ID)
        if (userId.length > 10 && userId.startsWith('c')) {
          targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true }
          })
        }
        
        // If not found, try to find by handle
        if (!targetUser) {
          const handle = await db.handle.findFirst({
            where: { 
              handle: userId.toLowerCase().replace(/^@/, ''),
              host: SITE_NAME
            },
            include: { user: { select: { id: true } } }
          })
          
          if (handle) {
            targetUser = handle.user
            resolvedUserId = handle.user.id
          }
        }

        if (!targetUser) {
          return res.status(404).json({ error: 'User not found' })
        }
      }

      // Prevent curator from blocking themselves
      if (blockType === 'user' && resolvedUserId === viewer.id) {
        return res.status(400).json({ error: 'Cannot block yourself' })
      }

      // Prevent blocking other curators
      if (blockType === 'user' && resolvedUserId === threadRing.curatorId) {
        return res.status(400).json({ error: 'Cannot block the curator' })
      }

      // Check if block already exists
      const existingBlock = await db.threadRingBlock.findFirst({
        where: {
          threadRingId: threadRing.id,
          ...(blockType === 'user' && { blockedUserId: resolvedUserId }),
          ...(blockType === 'instance' && { blockedInstance: instance }),
          ...(blockType === 'actor' && { blockedActorUri: actorUri })
        }
      })

      if (existingBlock) {
        return res.status(409).json({ error: 'Block already exists' })
      }

      // Create the block in a transaction for audit logging
      const block = await db.$transaction(async (tx) => {
        // Create the block
        const newBlock = await tx.threadRingBlock.create({
          data: {
            threadRingId: threadRing.id,
            blockType: blockType as any,
            ...(blockType === 'user' && { blockedUserId: resolvedUserId }),
            ...(blockType === 'instance' && { blockedInstance: instance }),
            ...(blockType === 'actor' && { blockedActorUri: actorUri }),
            reason: reason || null,
            createdBy: viewer.id
          },
          include: {
            blockedUser: blockType === 'user' ? {
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
            } : undefined,
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
          }
        })

        // Log the block action for audit trail
        console.log(`AUDIT: ThreadRing ${threadRing.id} - User ${viewer.id} created ${blockType} block ${newBlock.id}`, {
          threadRingId: threadRing.id,
          moderatorId: viewer.id,
          action: 'block_create',
          blockType,
          targetUserId: resolvedUserId,
          targetInstance: instance,
          targetActorUri: actorUri,
          reason: reason || null,
          timestamp: new Date().toISOString()
        })

        return newBlock
      })

      // If blocking a user, remove them from the ThreadRing
      if (blockType === 'user') {
        await db.threadRingMember.deleteMany({
          where: {
            threadRingId: threadRing.id,
            userId: resolvedUserId
          }
        })

        // Update member count
        await db.threadRing.update({
          where: { id: threadRing.id },
          data: { memberCount: { decrement: 1 } }
        })
      }

      return res.status(201).json({ block })
    } catch (error) {
      console.error('Error creating block:', error)
      return res.status(500).json({ error: 'Failed to create block' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}