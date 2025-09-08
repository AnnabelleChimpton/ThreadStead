import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug, blockId } = req.query

  if (typeof slug !== 'string' || typeof blockId !== 'string') {
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

  // Find the block
  const block = await db.threadRingBlock.findFirst({
    where: {
      id: blockId,
      threadRingId: threadRing.id
    }
  })

  if (!block) {
    return res.status(404).json({ error: 'Block not found' })
  }

  if (req.method === 'DELETE') {
    // Remove the block (unblock)
    try {
      // Log the unblock action for audit trail
      console.log(`AUDIT: ThreadRing ${threadRing.id} - User ${viewer.id} removed ${block.blockType} block ${blockId}`, {
        threadRingId: threadRing.id,
        moderatorId: viewer.id,
        action: 'block_remove',
        blockType: block.blockType,
        targetUserId: block.blockedUserId,
        targetInstance: block.blockedInstance,
        targetActorUri: block.blockedActorUri,
        reason: block.reason || null,
        timestamp: new Date().toISOString()
      })

      await db.threadRingBlock.delete({
        where: { id: blockId }
      })

      return res.status(200).json({ message: 'Block removed successfully' })
    } catch (error) {
      console.error('Error removing block:', error)
      return res.status(500).json({ error: 'Failed to remove block' })
    }
  }

  if (req.method === 'PUT') {
    // Update block (only reason can be updated)
    const { reason } = req.body

    try {
      // Log the block update action for audit trail
      console.log(`AUDIT: ThreadRing ${threadRing.id} - User ${viewer.id} updated ${block.blockType} block ${blockId}`, {
        threadRingId: threadRing.id,
        moderatorId: viewer.id,
        action: 'block_update',
        blockType: block.blockType,
        targetUserId: block.blockedUserId,
        targetInstance: block.blockedInstance,
        targetActorUri: block.blockedActorUri,
        oldReason: block.reason || null,
        newReason: reason || null,
        timestamp: new Date().toISOString()
      })

      const updatedBlock = await db.threadRingBlock.update({
        where: { id: blockId },
        data: { reason: reason || null },
        include: {
          blockedUser: block.blockType === 'user' ? {
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

      return res.status(200).json({ block: updatedBlock })
    } catch (error) {
      console.error('Error updating block:', error)
      return res.status(500).json({ error: 'Failed to update block' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}