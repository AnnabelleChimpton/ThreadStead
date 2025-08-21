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

  if (req.method === 'GET') {
    // Get responses for a prompt
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

      // Pagination parameters
      const page = parseInt(req.query.page as string) || 1
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
      const skip = (page - 1) * limit

      // Get prompt to verify it exists
      const prompt = await db.threadRingPrompt.findFirst({
        where: {
          id: promptId,
          threadRingId: threadRing.id
        }
      })

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' })
      }

      // Get responses with posts
      const responses = await db.postThreadRingPrompt.findMany({
        where: { promptId },
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
              },
              threadRings: {
                include: {
                  threadRing: {
                    select: {
                      id: true,
                      name: true,
                      slug: true
                    }
                  }
                }
              },
              _count: {
                select: {
                  comments: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })

      // Filter posts based on visibility
      const filteredResponses = responses.filter(response => {
        const post = response.post
        
        // Public posts are always visible
        if (post.visibility === 'public') return true
        
        // For non-public posts, check if viewer has access
        if (!viewer) return false
        
        // Author can always see their own posts
        if (post.authorId === viewer.id) return true
        
        // For friends/followers visibility, would need to check relationships
        // For now, we'll exclude these unless it's the author
        return false
      })

      // Get total count for pagination
      const totalCount = await db.postThreadRingPrompt.count({
        where: { promptId }
      })

      return res.status(200).json({
        responses: filteredResponses,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      })
    } catch (error) {
      console.error('Error fetching prompt responses:', error)
      return res.status(500).json({ error: 'Failed to fetch prompt responses' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}