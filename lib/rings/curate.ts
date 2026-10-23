import { db } from '@/lib/config/database/connection'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { RingHubAuthError, RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors'
import { forgetRingReads } from '@/lib/api/ringhub/forget-ring-reads'
import { extractPostIdFromUri, isOurThreadSteadInstance } from '@/lib/domain/threadrings/orphan-postrefs'

export type RingPostAction = 'pin' | 'unpin' | 'remove'

/**
 * Pin, unpin or take a post out of a ring, as the resident: the hub's
 * /curate with the PostRef id, signed by them, so the hub checks their role
 * in the ring (moderate_posts: the host and moderators). A removal also
 * drops this site's mirror of the post being in the ring, which the post's
 * "Posted to" list reads.
 */
export async function curateRingPost(
  userId: string,
  slug: string,
  postRefId: string,
  action: RingPostAction,
  reason?: string
) {
  const result = await createAuthenticatedRingHubClient(userId).curatePost(postRefId, action, reason ? { reason } : undefined)
  if (action === 'remove') {
    const slugs = result.affectedRings?.map((ring) => ring.slug) ?? [result.post?.ringSlug ?? slug]
    for (const ringSlug of slugs) forgetRingReads(ringSlug)
    await forgetLocalRingPost(result.post?.uri, slugs)
  }
  return result
}

async function forgetLocalRingPost(uri: string | undefined, slugs: string[]) {
  const postId = uri && isOurThreadSteadInstance(uri) ? extractPostIdFromUri(uri) : null
  if (!postId) return
  try {
    const rings = await db.threadRing.findMany({ where: { slug: { in: slugs } }, select: { id: true } })
    for (const ring of rings) {
      const { count } = await db.postThreadRing.deleteMany({ where: { postId, threadRingId: ring.id } })
      if (count > 0) {
        await db.threadRing.updateMany({ where: { id: ring.id, postCount: { gt: 0 } }, data: { postCount: { decrement: 1 } } })
      }
    }
  } catch (error) {
    // Only the mirror; the hub already has it right
    console.error('Could not update the local copy of a ring post removal:', error)
  }
}

/** A refused or failed curate, as a status and a plain sentence. */
export function curateFailure(error: unknown): [number, string] {
  const { status, data } = (error ?? {}) as { status?: number; data?: { message?: string } }
  // The hub checks authorship before moderation, so it refuses anyone pinning their own post
  if (status === 403 && data?.message?.startsWith('Authors can only remove')) {
    return [403, "Ring Hub doesn't let anyone pin their own post yet."]
  }
  if (status === 403) return [403, "Only the ring's host and moderators can do that."]
  if (status === 404) return [404, "That post isn't in this ring any more."]
  if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
    return [503, "We can't reach Ring Hub right now. Try again in a minute."]
  }
  console.error('Ring post moderation failed:', error)
  return [502, "We can't reach Ring Hub right now. Try again in a minute."]
}
