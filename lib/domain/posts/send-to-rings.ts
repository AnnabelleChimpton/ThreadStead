/**
 * Sending a post to rings, end to end: submit to Ring Hub (postToRings), then
 * update ThreadStead's two mirrors for what the hub accepted.
 *
 * Used by create.ts (a new post) and /api/posts/rings (an existing post, for
 * "Try again" and "Add to a ring"), so both take the same path.
 *
 * Data ownership (see ring-submission.ts): Ring Hub owns membership and the
 * PostRef. ThreadStead mirrors Post.threadRingPostIds (hub PostRef ids, used
 * for removal) and PostThreadRing rows (the "Posted to" line), only for rings
 * the hub accepted.
 */
import { db } from '@/lib/config/database/connection'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { buildPostUri, generateTextPreview, generateExcerpt } from '@/lib/domain/posts/ringhub-metadata'
import {
  postToRings,
  refuseNonPublicPost,
  type RingPostResult,
} from '@/lib/domain/posts/ring-submission'

export const OUR_END_REASON = 'Something went wrong on our end. Try again later.'

/** The post fields a ring submission needs. */
export interface PostForRings {
  id: string
  title: string
  bodyText: string | null
  bodyHtml: string | null
  bodyMarkdown: string | null
  visibility: string
  isSpoiler: boolean
  contentWarning: string | null
  metadata: unknown
  publishedAt: Date | null
}

export interface SendPostToRingsInput {
  post: PostForRings
  /** The author's primaryHandle, for the post URI. */
  authorHandle: string | null | undefined
  /** The author's user id. Only the author may send their post to a ring. */
  userId: string
  /** Ring slugs. */
  ringSlugs: string[]
  /** Set when the post answers a ring prompt. */
  promptId?: string
}

/**
 * Submits the post to each ring and mirrors the accepted ones locally.
 * Never throws: every requested ring gets a result.
 */
export async function sendPostToRings(input: SendPostToRingsInput): Promise<RingPostResult[]> {
  const { post, ringSlugs } = input
  if (ringSlugs.length === 0) return []

  // Rings are public spaces: a non-public post goes to none of them.
  const nonPublicRefusal = refuseNonPublicPost(ringSlugs, post.visibility)
  if (nonPublicRefusal) return nonPublicRefusal

  let results: RingPostResult[] = []
  try {
    results = await sendViaRingHub(input)
  } catch (error) {
    console.error('ThreadRing association error:', error)
    // Don't fail the caller; report the rings we couldn't finish.
    const reported = new Set(results.map((r) => r.slug))
    results = [
      ...results,
      ...Array.from(new Set(ringSlugs))
        .filter((slug) => !reported.has(slug))
        .map((slug) => ({ slug, name: slug, status: 'failed' as const, reason: OUR_END_REASON })),
    ]
  }
  return results
}

async function sendViaRingHub({ post, authorHandle, userId, ringSlugs, promptId }: SendPostToRingsInput): Promise<RingPostResult[]> {
  const authenticatedClient = createAuthenticatedRingHubClient(userId)

  const baseUrl = getSiteBaseUrl()
  // Unset falls back to http://localhost:3000, so it counts as localhost
  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
  const uri = buildPostUri(authorHandle, post.id)

  // Prompt details per ring, filled in while building each submission and
  // reused after the hub accepts it.
  const promptDetailsBySlug = new Map<string, any>()

  const results = await postToRings(authenticatedClient, ringSlugs, {
    visibility: post.visibility,
    // Dev mode workaround: a prompt response may target a ring the user
    // hasn't joined (all users used to share the server DID in dev).
    skipMembershipCheck: isLocalhost && !!promptId,
    buildSubmission: async ({ slug, name: ringName }) => {
      const base = {
        title: post.title.length > 200 ? post.title.substring(0, 197) + '...' : post.title,
        textPreview: generateTextPreview(post.bodyText, post.bodyHtml, post.bodyMarkdown),
        excerpt: generateExcerpt(post.bodyText, post.bodyHtml, post.bodyMarkdown),
        publishedAt: (post.publishedAt ?? new Date()).toISOString(),
        platform: 'blog',
        threadRingSlug: slug,
        threadRingName: ringName,
        // Add user identification for dev mode workaround
        threadsteadUserId: userId,
        authorHandle,
        // Spoiler content warning information
        isSpoiler: post.isSpoiler || false,
        contentWarning: post.contentWarning || null,
        // Include journal metadata
        ...((post.metadata as object) || {}),
      }

      const promptDetails = promptId ? await lookUpPrompt(slug, promptId, isLocalhost) : null
      if (!promptDetails) return { uri, digest: `sha256:${post.id}`, metadata: base }

      promptDetailsBySlug.set(slug, promptDetails)
      return {
        uri,
        digest: `sha256:${post.id}`,
        metadata: {
          type: 'prompt_response',
          response: {
            promptId,
            promptTitle: promptDetails.prompt.title,
            responseType: 'direct',
            respondedAt: new Date().toISOString(),
            // Add user identification for dev mode workaround
            threadsteadUserId: userId,
          },
          ...base,
        },
      }
    },
  })

  await mirrorRingResults({ postId: post.id, userId, results })

  // If this was a prompt response, update the response count
  for (const r of results) {
    const promptDetails = promptDetailsBySlug.get(r.slug)
    if (r.status === 'failed' || !promptDetails) continue
    try {
      const { createPromptService } = await import('@/lib/utils/data/prompt-service')
      await createPromptService(r.slug).associatePostWithPrompt(userId, uri, promptId!, promptDetails.prompt.title)
    } catch (countError) {
      console.error(`Failed to update response count for prompt ${promptId} in ring ${r.slug}:`, countError)
    }
  }

  return results
}

async function lookUpPrompt(slug: string, promptId: string, isLocalhost: boolean): Promise<any | null> {
  // Dev mode workaround: if the prompt can't be found, treat it as a prompt
  // response anyway with minimal details.
  const devFallback = isLocalhost ? { prompt: { promptId, title: 'Dev Mode Prompt' } } : null
  try {
    const { createPromptService } = await import('@/lib/utils/data/prompt-service')
    const promptDetails = await createPromptService(slug).getPromptDetails(promptId)
    return promptDetails || devFallback
  } catch {
    return devFallback
  }
}

export interface MirrorRingResultsInput {
  postId: string
  userId: string
  results: RingPostResult[]
}

/**
 * Writes ThreadStead's two mirrors of what the hub accepted:
 *  - merges hub PostRef ids into Post.threadRingPostIds (keeps earlier rings)
 *  - links the post to each 'posted' ring (PostThreadRing) and bumps that
 *    ring's postCount, creating a local ThreadRing row for a hub ring we
 *    haven't seen yet. A ring the post is already linked to is left alone,
 *    so sending again never double-counts.
 *
 * Only 'posted' rings get a link. A 'pending' ring keeps its PostRef id (so
 * removal can find it) but isn't shown as "Posted to" until it's accepted.
 */
export async function mirrorRingResults({ postId, userId, results }: MirrorRingResultsInput): Promise<void> {
  const newIds: Record<string, string> = {}
  for (const r of results) {
    if (r.hubPostId) newIds[r.slug] = r.hubPostId
  }
  if (Object.keys(newIds).length > 0) {
    try {
      const current = await db.post.findUnique({ where: { id: postId }, select: { threadRingPostIds: true } })
      const existing = (current?.threadRingPostIds as Record<string, string> | null) || {}
      await db.post.update({ where: { id: postId }, data: { threadRingPostIds: { ...existing, ...newIds } } })
    } catch (idMapError) {
      console.error('Failed to save Ring Hub post ids:', idMapError)
    }
  }

  const postedSlugs = results.filter((r) => r.status === 'posted').map((r) => r.slug)
  if (postedSlugs.length === 0) return
  const nameBySlug = new Map(results.map((r) => [r.slug, r.name]))

  try {
    const localRings = await db.threadRing.findMany({
      where: { slug: { in: postedSlugs } },
      select: { id: true, slug: true, name: true },
    })
    const ringsBySlug = new Map(localRings.map((ring) => [ring.slug, ring]))

    // Create missing local ThreadRing records for Ring Hub rings. The hub
    // owns the ring, so the poster isn't its curator: name the owner we
    // track in RingHubOwnership, or no one (ownership transfer fills it in).
    const missingSlugs = postedSlugs.filter((s) => !ringsBySlug.has(s))
    const owners = missingSlugs.length > 0
      ? await db.ringHubOwnership.findMany({
          where: { ringSlug: { in: missingSlugs } },
          select: { ringSlug: true, ownerUserId: true },
        })
      : []
    const ownerBySlug = new Map(owners.map((o) => [o.ringSlug, o.ownerUserId]))
    for (const slug of missingSlugs) {
      try {
        const ringName = nameBySlug.get(slug) || slug
        const created = await db.threadRing.create({
          data: {
            uri: `${getSiteBaseUrl()}/tr/${slug}`,
            name: ringName,
            slug,
            description: `RingHub ThreadRing: ${ringName}`,
            visibility: 'public',
            curatorId: ownerBySlug.get(slug) ?? null,
            joinType: 'open',
            postCount: 0,
            memberCount: 1,
          },
          select: { id: true, slug: true, name: true },
        })
        ringsBySlug.set(slug, created)
      } catch (createError) {
        console.error(`Failed to create local ThreadRing ${slug}:`, createError)
      }
    }

    const ringIds = Array.from(ringsBySlug.values()).map((ring) => ring.id)
    if (ringIds.length === 0) return
    const alreadyLinked = await db.postThreadRing.findMany({
      where: { postId, threadRingId: { in: ringIds } },
      select: { threadRingId: true },
    })
    const linked = new Set(alreadyLinked.map((l) => l.threadRingId))
    const toLink = ringIds.filter((id) => !linked.has(id))
    if (toLink.length === 0) return

    // Link and bump postCount together, keeping counts symmetric with
    // removal's decrement.
    await db.$transaction([
      db.postThreadRing.createMany({
        data: toLink.map((threadRingId) => ({ postId, threadRingId, addedBy: userId })),
        skipDuplicates: true,
      }),
      db.threadRing.updateMany({
        where: { id: { in: toLink } },
        data: { postCount: { increment: 1 } },
      }),
    ])
  } catch (localAssocError) {
    // The hub has the post, so the ring feed shows it; only the local
    // "Posted to" mirror is missing. Don't fail the caller over it.
    console.error('Failed to create local PostThreadRing associations:', localAssocError)
  }
}
