import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { db } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug, promptId } = req.query

  if (typeof slug !== 'string' || typeof promptId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  const viewer = await getSessionUser(req)

  if (req.method === 'GET') {
    // Get a specific prompt with its responses
    try {
      const threadRing = await db.threadRing.findUnique({
        where: { slug },
        select: { 
          id: true,
          visibility: true
        }
      })

      if (!threadRing) {
        return res.status(404).json({ error: 'ThreadRing not found' })
      }

      // Check visibility
      if (threadRing.visibility === 'private') {
        if (!viewer) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const isMember = await db.threadRingMember.findFirst({
          where: {
            threadRingId: threadRing.id,
            userId: viewer.id
          }
        })

        if (!isMember) {
          return res.status(403).json({ error: 'Access denied - private ThreadRing' })
        }
      }

      const prompt = await db.threadRingPrompt.findFirst({
        where: {
          id: promptId,
          threadRingId: threadRing.id
        },
        include: {
          createdBy: {
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
          responses: {
            include: {
              post: {
                include: {
                  author: {
                    select: {
                      id: true,
                      handles: {
                        take: 1,
                        select: { handle: true }
                      },
                      profile: {
                        select: { 
                          displayName: true,
                          avatarUrl: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Initial batch of responses
          }
        }
      })

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' })
      }

      return res.status(200).json(prompt)
    } catch (error) {
      console.error('Error fetching prompt:', error)
      return res.status(500).json({ error: 'Failed to fetch prompt' })
    }
  }

  if (req.method === 'PUT') {
    // Update a prompt (curator/moderator only)
    if (!viewer) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    try {
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
        return res.status(403).json({ error: 'Only curators and moderators can update prompts' })
      }

      const { title, description, endsAt, isActive, isPinned } = req.body

      // If setting as active, deactivate other prompts
      if (isActive) {
        await db.threadRingPrompt.updateMany({
          where: {
            threadRingId: threadRing.id,
            isActive: true,
            id: { not: promptId }
          },
          data: { isActive: false }
        })
      }

      // Update the prompt
      const prompt = await db.threadRingPrompt.update({
        where: { id: promptId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
          ...(isActive !== undefined && { isActive }),
          ...(isPinned !== undefined && { isPinned })
        },
        include: {
          createdBy: {
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

      return res.status(200).json(prompt)
    } catch (error) {
      console.error('Error updating prompt:', error)
      return res.status(500).json({ error: 'Failed to update prompt' })
    }
  }

  if (req.method === 'DELETE') {
    // Delete a prompt (curator only)
    if (!viewer) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    try {
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

      // Check if user is curator
      if (threadRing.curatorId !== viewer.id) {
        return res.status(403).json({ error: 'Only curators can delete prompts' })
      }

      // Delete the prompt (cascades to responses)
      await db.threadRingPrompt.delete({
        where: { id: promptId }
      })

      return res.status(200).json({ message: 'Prompt deleted successfully' })
    } catch (error) {
      console.error('Error deleting prompt:', error)
      return res.status(500).json({ error: 'Failed to delete prompt' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}