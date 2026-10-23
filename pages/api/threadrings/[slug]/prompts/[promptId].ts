import { apiHandler, ApiError } from '@/lib/api/handler'
import { rateLimitCheck } from '@/lib/server/http/rate-limit'
import { createPromptService, promptFeedReader } from '@/lib/utils/data/prompt-service'

/**
 * One prompt.
 *   GET     it, with its responses, read as the viewer.
 *   DELETE  takes it down, signed as the viewer: Ring Hub lets its author and
 *           the ring's moderators. Prompts can't be edited: the hub can't
 *           change a post once it's in a ring.
 */
export default apiHandler(
  { methods: ['GET', 'DELETE'], auth: 'optional' },
  async (req, res, { user }) => {
    const { slug, promptId } = req.query
    if (typeof slug !== 'string' || typeof promptId !== 'string') throw new ApiError(400, 'Invalid parameters')
    const service = createPromptService(slug, await promptFeedReader(user?.id))

    if (req.method === 'GET') {
      const details = await service.getPromptDetails(promptId)
      if (!details) throw new ApiError(404, 'Prompt not found')
      return res.json({
        id: details.prompt.promptId,
        title: details.prompt.title,
        description: details.prompt.description,
        startsAt: details.prompt.startsAt,
        endsAt: details.prompt.endsAt,
        isActive: details.prompt.isActive,
        isPinned: details.prompt.isPinned,
        responseCount: details.responseCount,
        createdById: details.prompt.createdById,
        createdBy: { id: details.prompt.createdBy, handles: [], profile: { displayName: null } },
        responses: details.responses.map((response) => ({
          id: response.id,
          postId: response.uri.split('/').pop(),
          createdAt: response.submittedAt,
          post: {
            title: 'Response Post',
            author: { id: response.submittedBy, handles: [], profile: { displayName: null, avatarUrl: null } },
          },
        })),
      })
    }

    if (!user) throw new ApiError(401, 'Authentication required')
    // Writes only: reading prompts shouldn't spend the write budget
    if (!(await rateLimitCheck(req, res, 'threadring_operations', user.id))) return
    try {
      await service.deletePrompt(user.id, promptId)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'Prompt not found' || message === 'Prompt not found in Ring Hub') throw new ApiError(404, 'Prompt not found')
      if (message === 'Prompt already deleted') throw new ApiError(410, "It's already gone.")
      if (message.startsWith('Permission denied')) throw new ApiError(403, 'Only whoever posted it and the ring’s moderators can delete it.')
      console.error('Error deleting prompt:', error)
      throw new ApiError(502, "Couldn't delete the prompt. Try again in a minute.")
    }
    res.json({ success: true })
  }
)
