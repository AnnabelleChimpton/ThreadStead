import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { db } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug' })
  }

  if (req.method === 'GET') {
    // Get all prompts for a ThreadRing
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
      const viewer = await getSessionUser(req)
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

      // Get prompts with creator info using correct user fields
      const prompts = await db.threadRingPrompt.findMany({
        where: { threadRingId: threadRing.id },
        include: {
          createdBy: {
            select: {
              id: true,
              handles: {
                take: 1,
                select: {
                  handle: true
                }
              },
              profile: {
                select: {
                  displayName: true
                }
              }
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { isPinned: 'desc' },
          { startsAt: 'desc' }
        ]
      })

      return res.status(200).json(prompts)
    } catch (error) {
      console.error('Error fetching prompts:', error)
      return res.status(500).json({ error: 'Failed to fetch prompts' })
    }
  }

  if (req.method === 'POST') {
    // Create a new prompt (curator/moderator only)
    const viewer = await getSessionUser(req)
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
        return res.status(403).json({ error: 'Only curators and moderators can create prompts' })
      }

      const { title, description, endsAt, isActive, isPinned } = req.body

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' })
      }

      // If setting as active, deactivate other prompts
      if (isActive) {
        await db.threadRingPrompt.updateMany({
          where: {
            threadRingId: threadRing.id,
            isActive: true
          },
          data: { isActive: false }
        })
      }

      // Create the prompt
      const prompt = await db.threadRingPrompt.create({
        data: {
          threadRingId: threadRing.id,
          title,
          description,
          endsAt: endsAt ? new Date(endsAt) : null,
          isActive: isActive ?? false,
          isPinned: isPinned ?? false,
          createdById: viewer.id
        }
      })

      return res.status(201).json(prompt)
    } catch (error) {
      console.error('Error creating prompt:', error)
      return res.status(500).json({ error: 'Failed to create prompt' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}