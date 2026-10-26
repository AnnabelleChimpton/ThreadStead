import { apiHandler } from '@/lib/api/handler'
import { createPromptService, promptFeedReader } from '@/lib/utils/data/prompt-service'
import { parsePagePagination } from '@/lib/server/http/pagination';
import { db } from '@/lib/config/database/connection'
import { getHiddenIds } from '@/lib/domain/users/blocks'
import { extractPostIdFromUri, isOurThreadSteadInstance } from '@/lib/domain/threadrings/orphan-postrefs'

export default apiHandler({ methods: ['GET'], auth: 'optional' }, async (req, res, { user: viewer }) => {
  const { slug, promptId } = req.query

  if (typeof slug !== 'string' || typeof promptId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  try {
    // Read as the viewer, so a private ring's members see its prompts
    const promptService = createPromptService(slug, await promptFeedReader(viewer?.id))
    
    // Get prompt details and responses
    const promptDetails = await promptService.getPromptDetails(promptId)
    
    if (!promptDetails) {
      return res.status(404).json({ error: 'Prompt not found' })
    }

    // Pagination parameters
    const { page, limit, skip } = parsePagePagination(req.query, { defaultLimit: 20, maxLimit: 50 })

    // Get responses from Ring Hub
    const responses = await promptService.getPromptResponses(promptId)
    
    // Apply pagination
    const paginatedResponses = responses.slice(skip, skip + limit)
    
    // Only our own public posts by residents this viewer may see are
    // shown in full; anything else is the PostRef's own title and preview,
    // as the ring feed shows it (lib/feeds/ring-feed.ts). The submitter
    // writes the metadata, so it never names a resident here.
    const { blockedUserIds } = await getHiddenIds(viewer?.id)
    const localIds = paginatedResponses
      .filter((response) => isOurThreadSteadInstance(response.uri))
      .map((response) => extractPostIdFromUri(response.uri) ?? '')
    const posts = await db.post.findMany({
      where: { id: { in: localIds }, visibility: 'public', authorId: { notIn: blockedUserIds } },
      select: {
        id: true, title: true, bodyText: true, bodyHtml: true, bodyMarkdown: true, visibility: true, createdAt: true, authorId: true,
        author: { select: { id: true, primaryHandle: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    })
    const byId = new Map(posts.map((post) => [post.id, post]))

    const transformedResponses = paginatedResponses.map((response) => {
      const metadata = (response.metadata ?? {}) as Record<string, any>
      const ours = isOurThreadSteadInstance(response.uri)
      const local = ours ? byId.get(extractPostIdFromUri(response.uri) ?? '') : undefined
      // No username, no page to link: shown like a post that isn't public
      const username = local?.author.primaryHandle?.split('@')[0]
      const post = local && username
        ? {
            ...local,
            createdAt: local.createdAt.toISOString(),
            author: {
              id: local.author.id,
              handles: [{ handle: username }],
              profile: local.author.profile,
            },
            url: `/resident/${encodeURIComponent(username)}/post/${local.id}`,
          }
        : {
            id: response.id,
            title: metadata.title || 'A response from elsewhere',
            bodyText: metadata.textPreview || null,
            bodyHtml: null,
            bodyMarkdown: null,
            visibility: 'public',
            createdAt: response.submittedAt,
            authorId: response.submittedBy,
            author: {
              id: response.submittedBy,
              handles: [],
              // One of ours that isn't shown names nobody: the name could be a hidden resident's
              profile: { displayName: ours ? null : metadata.actorName || null, avatarUrl: null },
            },
            url: /^https?:\/\//i.test(response.uri) ? response.uri : null,
          }

      return {
        id: response.id,
        postId: post.id,
        createdAt: response.submittedAt,
        post: {
          ...post,
          threadRings: [{ threadRing: { id: slug, name: slug, slug } }],
          _count: { comments: 0 }, // Not available from Ring Hub PostRef
        },
      }
    })

    return res.status(200).json({
      responses: transformedResponses,
      pagination: {
        page,
        limit,
        totalCount: responses.length,
        totalPages: Math.ceil(responses.length / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching prompt responses:', error)
    return res.status(500).json({ error: 'Failed to fetch prompt responses' })
  }
})