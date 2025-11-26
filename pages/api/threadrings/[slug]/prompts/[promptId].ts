import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth/server'
import { createPromptService } from '@/lib/utils/data/prompt-service'
import { withThreadRingSupport } from '@/lib/api/ringhub/ringhub-middleware'
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

export default withRateLimit('threadring_operations')(
  withCsrfProtection(
    withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  const { slug, promptId } = req.query

  if (typeof slug !== 'string' || typeof promptId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  const viewer = await getSessionUser(req)

  // Ring Hub system - use PostRef-based prompts
  if (system === 'ringhub') {
    const promptService = createPromptService(slug)

    if (req.method === 'GET') {
      try {
        const promptDetails = await promptService.getPromptDetails(promptId)
        
        if (!promptDetails) {
          return res.status(404).json({ error: 'Prompt not found' })
        }

        // Transform to match old API format for frontend compatibility
        const response = {
          id: promptDetails.prompt.promptId,
          title: promptDetails.prompt.title,
          description: promptDetails.prompt.description,
          startsAt: promptDetails.prompt.startsAt,
          endsAt: promptDetails.prompt.endsAt,
          isActive: promptDetails.prompt.isActive,
          isPinned: promptDetails.prompt.isPinned,
          responseCount: promptDetails.responseCount,
          createdById: promptDetails.prompt.createdById,
          createdBy: {
            id: promptDetails.prompt.createdBy,
            // Note: DID-based user info would need resolution
            handles: [],
            profile: { displayName: null }
          },
          responses: promptDetails.responses.map(response => ({
            id: response.id,
            postId: response.uri.split('/').pop(), // Extract post ID from URI
            createdAt: response.submittedAt,
            post: {
              // This would need to be resolved from the post URI
              title: 'Response Post',
              author: {
                id: response.submittedBy,
                handles: [],
                profile: { displayName: null, avatarUrl: null }
              }
            }
          }))
        }

        return res.status(200).json(response)
      } catch (error) {
        console.error('Error fetching prompt:', error)
        return res.status(500).json({ error: 'Failed to fetch prompt' })
      }
    }

    if (req.method === 'PUT') {
      return res.status(501).json({ 
        error: 'Prompt updates not yet supported in Ring Hub system' 
      })
    }

    if (req.method === 'DELETE') {
      if (!viewer) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      try {
        await promptService.deletePrompt(viewer.id, promptId)
        return res.status(200).json({
          success: true,
          message: 'Prompt deleted successfully'
        })
      } catch (error: any) {
        console.error('Error deleting prompt:', error)

        // Handle specific error cases
        if (error.message === 'Prompt not found') {
          return res.status(404).json({ error: 'Prompt not found' })
        }

        if (error.message === 'Prompt already deleted') {
          return res.status(410).json({ error: 'Prompt already deleted' })
        }

        if (error.message.includes('Permission denied')) {
          return res.status(403).json({ error: error.message })
        }

        return res.status(500).json({ error: 'Failed to delete prompt' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Local system fallback (deprecated)
  return res.status(404).json({ error: 'Local prompt system no longer supported' })
    })
  )
)