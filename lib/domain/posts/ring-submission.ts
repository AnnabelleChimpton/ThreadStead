/**
 * Submitting a new post to Ring Hub rings, with a result for every ring.
 *
 * Data ownership: Ring Hub owns ring membership and the PostRef that puts a
 * post in a ring (ring feeds and My Rings read the hub). ThreadStead owns the
 * post itself and keeps two mirrors: Post.threadRingPostIds (hub PostRef ids,
 * used for removal) and PostThreadRing rows (the "Posted to" line). Callers
 * mirror only rings this returns as 'posted'.
 *
 * Every requested ring gets a result. Before this existed, create.ts dropped
 * failures into the server log and returned 201, so the composer could not
 * tell the user their post never reached the ring.
 */
import { RingHubAuthError, RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors'

export type RingPostStatus = 'posted' | 'pending' | 'failed'

export interface RingPostResult {
  slug: string
  name: string
  status: RingPostStatus
  /** Plain-language reason, shown to the user when status is 'failed'. */
  reason?: string
  /** The hub PostRef id, when the hub returned one. */
  hubPostId?: string
}

export interface RingSubmission {
  uri: string
  digest: string
  metadata?: Record<string, unknown>
}

interface MembershipSummary {
  ringSlug: string
  ringName: string
  status: string
}

/** The two hub calls this needs. RingHubClient and AuthenticatedRingHubClient both fit. */
export interface RingPostingClient {
  getMyMemberships(options?: {
    status?: 'ACTIVE' | 'PENDING' | 'REVOKED'
    limit?: number
    offset?: number
  }): Promise<{ memberships: MembershipSummary[]; hasMore: boolean }>
  submitPost(ringSlug: string, submission: RingSubmission): Promise<{ id?: string; status?: string } | null>
}

// The hub caps /trp/my/memberships at 100 per page and defaults to 20. Reading
// only the first page made every ring past the 20th look like "not a member".
const MEMBERSHIP_PAGE_SIZE = 100

export async function getAllActiveMemberships(client: RingPostingClient): Promise<MembershipSummary[]> {
  const all: MembershipSummary[] = []
  for (let offset = 0; ; offset += MEMBERSHIP_PAGE_SIZE) {
    const page = await client.getMyMemberships({ status: 'ACTIVE', limit: MEMBERSHIP_PAGE_SIZE, offset })
    all.push(...page.memberships)
    if (!page.hasMore || page.memberships.length < MEMBERSHIP_PAGE_SIZE) return all
  }
}

export const NOT_A_MEMBER_REASON = "You're not a member of this ring."
export const PUBLIC_ONLY_REASON = 'Only public posts can go to a ring.'

/**
 * Rings are public: a hub PostRef carries the title and a text preview, and
 * hub feeds (ring, My Rings, Trending) serve them to anyone. So a followers,
 * friends or private post is never submitted. Returns a 'failed' result per
 * ring for a non-public post, or null when the post may go ahead.
 */
export function refuseNonPublicPost(requestedSlugs: string[], visibility: string): RingPostResult[] | null {
  if (visibility === 'public') return null
  return Array.from(new Set(requestedSlugs.filter((s) => typeof s === 'string' && s.length > 0))).map((slug) => ({
    slug,
    name: slug,
    status: 'failed' as const,
    reason: PUBLIC_ONLY_REASON,
  }))
}

/** Turns a hub or network error into a short reason a user can act on. */
export function describeRingFailure(error: unknown): string {
  if (error instanceof RingHubAuthError) {
    return "Ring Hub couldn't confirm it's you. Try again in a bit."
  }
  if (error instanceof RingHubUnavailableError) {
    return "Ring Hub didn't respond. Try again later."
  }

  const e = error as { status?: number; data?: { error?: string; message?: string } } | null
  const status = e?.status
  const hubError = e?.data?.error
  const hubMessage = e?.data?.message

  if (status === 403 && hubError === 'Members only') return NOT_A_MEMBER_REASON
  if (status === 403 && hubError === 'Submissions closed') return "This ring isn't taking new posts."
  if (status === 404) return 'This ring no longer exists.'
  if (status === 401) return "Ring Hub couldn't confirm it's you. Try again in a bit."
  if (status === 429) return 'Ring Hub is busy. Try again in a minute.'
  if (status !== undefined && status >= 400 && status < 500 && hubMessage) {
    return `Ring Hub turned it down: ${hubMessage}`
  }
  return "Ring Hub didn't respond. Try again later."
}

export interface PostToRingsOptions {
  /** The post's visibility. Anything but 'public' is refused before any hub call. */
  visibility: string
  /** Builds the hub submission for one ring (metadata can differ per ring). */
  buildSubmission: (ring: { slug: string; name: string }) => Promise<RingSubmission> | RingSubmission
  /** Submit even where the user isn't a member (the local-dev prompt workaround in create.ts). */
  skipMembershipCheck?: boolean
}

/**
 * Submits to each requested ring in turn and reports what happened in each.
 * Never throws: a failure anywhere becomes a 'failed' result for the rings it affects.
 */
export async function postToRings(
  client: RingPostingClient,
  requestedSlugs: string[],
  options: PostToRingsOptions
): Promise<RingPostResult[]> {
  const refused = refuseNonPublicPost(requestedSlugs, options.visibility)
  if (refused) return refused

  const slugs = Array.from(new Set(requestedSlugs.filter((s) => typeof s === 'string' && s.length > 0)))
  if (slugs.length === 0) return []

  let memberships: MembershipSummary[]
  try {
    memberships = await getAllActiveMemberships(client)
  } catch (error) {
    console.error('Ring Hub memberships lookup failed before ring submission:', error)
    const reason = describeRingFailure(error)
    return slugs.map((slug) => ({ slug, name: slug, status: 'failed' as const, reason }))
  }
  const nameBySlug = new Map(memberships.map((m) => [m.ringSlug, m.ringName]))

  const results: RingPostResult[] = []
  for (const slug of slugs) {
    const name = nameBySlug.get(slug) || slug
    if (!nameBySlug.has(slug) && !options.skipMembershipCheck) {
      results.push({ slug, name, status: 'failed', reason: NOT_A_MEMBER_REASON })
      continue
    }

    try {
      const submission = await options.buildSubmission({ slug, name })
      const ref = await client.submitPost(slug, submission)
      // Only an explicit PENDING (curated rings) is held back. A success with
      // no status is treated as accepted, as before.
      results.push({
        slug,
        name,
        status: ref?.status === 'PENDING' ? 'pending' : 'posted',
        hubPostId: ref?.id,
      })
    } catch (error) {
      const existing = (error as { status?: number; data?: { existingPost?: { id?: string; status?: string } } })
      if (existing?.status === 409 && existing.data?.existingPost) {
        // Already in the ring (a retried request): that's the outcome the user wanted.
        const prior = existing.data.existingPost
        results.push({
          slug,
          name,
          status: prior.status === 'PENDING' ? 'pending' : 'posted',
          hubPostId: prior.id,
        })
        continue
      }
      console.error(`Failed to submit post to Ring Hub ring ${slug}:`, error)
      results.push({ slug, name, status: 'failed', reason: describeRingFailure(error) })
    }
  }
  return results
}
