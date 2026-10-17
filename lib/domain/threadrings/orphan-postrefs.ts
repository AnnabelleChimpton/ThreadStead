/**
 * Orphaned hub PostRefs: RingHub PostRefs whose URI points at a ThreadStead
 * post that no longer exists in this instance's database (FUTURE_IMPROVEMENTS A3).
 *
 * Ownership: RingHub owns PostRef rows; ThreadStead owns posts. Before hub
 * commit e46efaf (2026-07) /trp/curate never ran on post deletion, so posts
 * deleted before then left PostRefs behind that every feed render tried (and
 * failed) to resolve.
 *
 * The only write here goes through the hub's own POST /trp/curate 'remove',
 * signed by someone the hub already authorizes:
 *  - the author (PostRef.actorDid / submittedBy) — the hub then marks every
 *    PostRef with the same uri + actorDid REMOVED, in all rings; or
 *  - opt-in, the ring owner (moderate_posts) — that one ring only. Needed when
 *    the author's account (and with it their UserDID key) is gone too.
 * REMOVED PostRefs stay in the hub DB (with an audit log row) but drop out of
 * GET /trp/rings/:slug/feed, which only serves ACCEPTED posts.
 */
import type { PostRef, RingDescriptor } from '@/lib/api/ringhub/ringhub-client'
import { getSiteBaseUrl } from '@/lib/config/site-url'

/** Post ID from a ThreadStead post URI (`.../resident/<user>/post/<id>`). */
export function extractPostIdFromUri(uri: string): string | null {
  const match = uri.match(/\/post\/([a-zA-Z0-9_-]+)$/)
  return match ? match[1] : null
}

/** Whether a PostRef URI belongs to this ThreadStead instance. */
export function isOurThreadSteadInstance(uri: string): boolean {
  const ourDomain = getSiteBaseUrl().replace(/https?:\/\//, '')
  try {
    const url = new URL(uri)
    return url.host === ourDomain || url.hostname === ourDomain
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Feed path: log a missing post once per process, not on every render.
// ---------------------------------------------------------------------------

const MAX_REMEMBERED_MISSING = 1000
const loggedMissingPostIds = new Set<string>()

/**
 * Warn about a feed PostRef whose local post is gone — once per post ID per
 * process. The feed skips these refs either way; the log only exists so the
 * reconcile script has something to point at.
 */
export function noteMissingLocalPost(postId: string, ref: { id?: string; ringSlug?: string }): void {
  if (loggedMissingPostIds.has(postId)) return
  if (loggedMissingPostIds.size >= MAX_REMEMBERED_MISSING) loggedMissingPostIds.clear()
  loggedMissingPostIds.add(postId)
  console.warn(
    `Skipping hub PostRef for a deleted ThreadStead post (logged once): post=${postId} ` +
    `ring=${ref.ringSlug ?? '?'} postRef=${ref.id ?? '?'}. ` +
    `Clean up with: npx tsx scripts/reconcile-orphan-postrefs.ts`
  )
}

/** Test hook. */
export function resetMissingPostLog(): void {
  loggedMissingPostIds.clear()
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

export interface OrphanPostRef {
  refId: string
  ringSlug: string
  uri: string
  postId: string
  actorDid: string
  submittedBy: string
  submittedAt: string
  status: string
}

export interface OrphanScanResult {
  ringsScanned: number
  ringsFailed: Array<{ slug: string; error: string }>
  refsScanned: number
  ourRefs: number
  /** Ours by host, but no post ID could be parsed from the URI. */
  unparseableUris: string[]
  orphans: OrphanPostRef[]
  /** Ring owners by slug, for the owner fallback. */
  ringOwners: Map<string, string>
}

interface HubReader {
  listRings(options?: { limit?: number; offset?: number }): Promise<{ rings: RingDescriptor[]; total: number }>
  getRingFeed(slug: string, options?: { limit?: number; offset?: number }): Promise<{ posts: PostRef[]; total: number }>
}

/** The hub's PostRef payload carries more than the client's PostRef type declares. */
type HubPostRef = PostRef & { actorDid?: string; ringSlug?: string }

export async function scanForOrphanPostRefs(opts: {
  hub: HubReader
  /** Which of these local post IDs still exist. */
  existingPostIds: (ids: string[]) => Promise<Set<string>>
  /** Restrict to these rings (default: every ring the hub lists). */
  ringSlugs?: string[]
  isOurUri?: (uri: string) => boolean
  pageSize?: number
}): Promise<OrphanScanResult> {
  const pageSize = opts.pageSize ?? 100
  const isOurUri = opts.isOurUri ?? isOurThreadSteadInstance

  const ringOwners = new Map<string, string>()
  let slugs: string[]
  if (opts.ringSlugs?.length) {
    slugs = opts.ringSlugs
  } else {
    slugs = []
    for (let offset = 0; ; offset += pageSize) {
      const page = await opts.hub.listRings({ limit: pageSize, offset })
      for (const ring of page.rings) {
        slugs.push(ring.slug)
        if (ring.ownerDid) ringOwners.set(ring.slug, ring.ownerDid)
      }
      if (page.rings.length < pageSize || slugs.length >= page.total) break
    }
  }

  const result: OrphanScanResult = {
    ringsScanned: 0,
    ringsFailed: [],
    refsScanned: 0,
    ourRefs: 0,
    unparseableUris: [],
    orphans: [],
    ringOwners,
  }
  const candidates: Array<{ ref: HubPostRef; slug: string; postId: string }> = []

  for (const slug of slugs) {
    try {
      // scope 'ring' (the default): a family scope would list a child ring's
      // refs under every relative and count them more than once.
      for (let offset = 0; ; offset += pageSize) {
        const feed = await opts.hub.getRingFeed(slug, { limit: pageSize, offset })
        for (const ref of feed.posts as HubPostRef[]) {
          result.refsScanned++
          if (!isOurUri(ref.uri)) continue
          result.ourRefs++
          const postId = extractPostIdFromUri(ref.uri)
          if (!postId) {
            result.unparseableUris.push(ref.uri)
            continue
          }
          candidates.push({ ref, slug, postId })
        }
        if (feed.posts.length < pageSize || offset + feed.posts.length >= feed.total) break
      }
      result.ringsScanned++
    } catch (error) {
      result.ringsFailed.push({ slug, error: error instanceof Error ? error.message : String(error) })
    }
  }

  const existing = await opts.existingPostIds([...new Set(candidates.map((c) => c.postId))])
  for (const { ref, slug, postId } of candidates) {
    if (existing.has(postId)) continue
    if (!ref.id) continue // the hub always sends it; nothing to curate without it
    result.orphans.push({
      refId: ref.id,
      ringSlug: ref.ringSlug ?? slug,
      uri: ref.uri,
      postId,
      actorDid: ref.actorDid ?? ref.submittedBy,
      submittedBy: ref.submittedBy,
      submittedAt: ref.submittedAt,
      status: ref.status ?? 'ACCEPTED',
    })
  }
  return result
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export type RemovalSigner =
  | { kind: 'author'; did: string; userId: string }
  | { kind: 'owner'; did: string; userId: string }

export interface RemovalPlanItem {
  orphan: OrphanPostRef
  /** Signs the curate call. Null with `coveredBy` (handled by another call) or when nobody local can sign. */
  signer: RemovalSigner | null
  /** refId of the author removal that also removes this ref (same uri + actorDid). */
  coveredBy?: string
  /** Why no signer was found. */
  blocked?: string
}

/**
 * Decide who signs each removal. One author-signed call per (uri, actorDid):
 * the hub removes every copy of that post across rings in that one call.
 */
export async function planOrphanRemoval(
  orphans: OrphanPostRef[],
  opts: {
    /** Local userId for each federation DID that still has a key here. */
    localUsersByDid: (dids: string[]) => Promise<Map<string, string>>
    ringOwners: Map<string, string>
    ownerFallback: boolean
  }
): Promise<RemovalPlanItem[]> {
  const dids = new Set<string>()
  for (const o of orphans) {
    dids.add(o.actorDid)
    dids.add(o.submittedBy)
    const owner = opts.ringOwners.get(o.ringSlug)
    if (owner) dids.add(owner)
  }
  const users = await opts.localUsersByDid([...dids])

  const authorCall = new Map<string, string>() // `${actorDid} ${uri}` → refId
  const plan: RemovalPlanItem[] = []
  for (const orphan of orphans) {
    const authorDid = users.has(orphan.actorDid) ? orphan.actorDid
      : users.has(orphan.submittedBy) ? orphan.submittedBy
      : null
    if (authorDid) {
      const key = `${orphan.actorDid} ${orphan.uri}`
      const first = authorCall.get(key)
      if (first) {
        plan.push({ orphan, signer: null, coveredBy: first })
      } else {
        authorCall.set(key, orphan.refId)
        plan.push({ orphan, signer: { kind: 'author', did: authorDid, userId: users.get(authorDid)! } })
      }
      continue
    }

    const ownerDid = opts.ringOwners.get(orphan.ringSlug)
    const ownerUserId = ownerDid ? users.get(ownerDid) : undefined
    if (opts.ownerFallback && ownerDid && ownerUserId) {
      plan.push({ orphan, signer: { kind: 'owner', did: ownerDid, userId: ownerUserId } })
      continue
    }
    plan.push({
      orphan,
      signer: null,
      blocked: ownerUserId
        ? 'author has no key here; rerun with --owner-fallback to remove as the ring owner'
        : 'neither the author nor the ring owner has a key on this instance',
    })
  }
  return plan
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

export interface RemovalOutcome {
  refId: string
  ok: boolean
  totalRemoved?: number
  error?: string
}

/** Run the plan's curate calls, one at a time. Plan items without a signer are skipped. */
export async function executeOrphanRemoval(
  plan: RemovalPlanItem[],
  opts: {
    curateAs: (userId: string) => { curatePost(postId: string, action: 'remove', options?: { reason?: string }): Promise<any> }
    reason?: string
  }
): Promise<RemovalOutcome[]> {
  const outcomes: RemovalOutcome[] = []
  for (const item of plan) {
    if (!item.signer) continue
    const reason = opts.reason ??
      `Reconcile: ThreadStead post ${item.orphan.postId} no longer exists`
    try {
      const result = await opts.curateAs(item.signer.userId).curatePost(item.orphan.refId, 'remove', { reason })
      outcomes.push({ refId: item.orphan.refId, ok: true, totalRemoved: result?.totalRemoved ?? 1 })
    } catch (error: any) {
      outcomes.push({
        refId: item.orphan.refId,
        ok: false,
        error: [error?.status, error?.message ?? String(error)].filter(Boolean).join(' '),
      })
    }
  }
  return outcomes
}
