import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { API_ERRORS } from '@/lib/api/errors'
import { rateLimitCheck } from '@/lib/server/http/rate-limit'
import { createPromptService, promptFeedReader } from '@/lib/utils/data/prompt-service'
import { hubWriteError, requireRingAs } from '@/lib/domain/threadrings/ring-access'
import { residentsByDid } from '@/lib/rings/page-data'
import type { PromptPostRefMetadata, ThreadRingPostRef } from '@/types/threadrings'

const schema = z.object({
  title: z.string().trim().min(1, 'Give the prompt a title').max(200, 'The title must be 200 characters or less'),
  description: z.string().trim().min(1, 'Say what the prompt asks').max(1000, 'The description must be 1000 characters or less'),
  endsAt: z.string().datetime({ offset: true, local: true }).nullish(),
  isActive: z.boolean().optional(),
})

/** A prompt PostRef in the shape the prompt components read. `author` is who posted it, when they live here. */
function promptView(postRef: ThreadRingPostRef, responseCount: number, author?: { username: string; displayName: string | null }) {
  const prompt = (postRef.metadata as PromptPostRefMetadata).prompt
  return {
    id: prompt.promptId,
    title: prompt.title,
    description: prompt.description,
    startsAt: prompt.startsAt,
    endsAt: prompt.endsAt,
    isActive: prompt.isActive,
    isPinned: prompt.isPinned,
    responseCount,
    createdById: prompt.createdById,
    createdBy: {
      id: prompt.createdBy,
      handles: author ? [{ handle: author.username }] : [],
      profile: { displayName: author ? author.displayName || author.username : null },
    },
    createdAt: postRef.submittedAt,
    updatedAt: postRef.submittedAt,
  }
}

/**
 * A ring's prompts: PostRefs in its Ring Hub feed.
 *   GET   the active ones (?includeInactive=true for all), read as the viewer
 *         so a private ring's members see them.
 *   POST  a new prompt, posted as the viewer: the Host and moderators only.
 */
export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'optional' },
  async (req, res, { user }) => {
    const slug = req.query.slug
    if (typeof slug !== 'string') throw new ApiError(400, 'Invalid slug')

    if (req.method === 'GET') {
      const service = createPromptService(slug, await promptFeedReader(user?.id))
      let prompts
      try {
        prompts = await service.getPrompts({ includeInactive: req.query.includeInactive === 'true', includePinned: true })
      } catch (error) {
        console.error('Error fetching prompts:', error)
        throw new ApiError(503, "We can't reach Ring Hub right now. Try again in a minute.")
      }
      // One feed read covers the responses too
      const [counts, authors] = await Promise.all([
        Promise.all(prompts.map((p) => service.getPromptResponses((p.metadata as PromptPostRefMetadata).prompt.promptId))),
        residentsByDid(prompts.map((p) => p.submittedBy).filter(Boolean), user?.id ?? null),
      ])
      res.setHeader('Cache-Control', 'no-store')
      return res.json(prompts.map((p, i) => promptView(p, counts[i].length, authors.get(p.submittedBy))))
    }

    if (!user) throw new ApiError(401, API_ERRORS.unauthenticated)
    // Writes only: reading prompts shouldn't spend the write budget
    if (!(await rateLimitCheck(req, res, 'threadring_operations', user.id))) return
    const body = schema.parse(req.body ?? {})
    const access = await requireRingAs(user, slug)
    if (!access.isSteward) throw new ApiError(403, 'Only the Host and moderators can post prompts.')

    let prompt
    try {
      prompt = await createPromptService(slug).createPrompt(user.id, {
        title: body.title,
        description: body.description,
        startsAt: new Date(),
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        isActive: body.isActive ?? true,
        // Pinning a prompt isn't offered: "Show it on the ring page" is isActive
        isPinned: false,
      })
    } catch (error) {
      throw hubWriteError(error)
    }
    res.status(201).json(promptView(prompt, 0))
  }
)
