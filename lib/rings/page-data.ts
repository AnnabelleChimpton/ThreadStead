import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { getPublicRingHubClient, type RingDescriptor } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { raceHubCall, HUB_TIMEOUT, HUB_SSR_TIMEOUT_MS } from '@/lib/api/ringhub/ringhub-ssr'
import { transformRingDescriptorToThreadRing } from '@/lib/api/ringhub/ringhub-transformers'
import { mapDIDsToUserIds } from '@/lib/api/did/server-did-client'
import { db } from '@/lib/config/database/connection'
import { usernameFromHandle } from '@/lib/domain/notifications/links'
import { visibleResidentWhere } from '@/lib/domain/users/profile-access'
import { readAsViewer } from '@/lib/rings/read-as-viewer'
import { drawnBadgeChoice } from '@/lib/badge-uploader'
import { keyFromPublicUrl } from '@/lib/storage/r2'

const RING_FRESH_MS = 30_000
const RING_STALE_MS = 5 * 60_000

/** What the ring page shows, all of it from the hub. */
export interface RingPageRing {
  id: string
  slug: string
  name: string
  description?: string | null
  curatorNote?: string | null
  bannerUrl?: string | null
  themeColor?: string | null
  joinType: string
  visibility: string
  memberCount: number
  postCount: number
  createdAt: string
  parentId?: string | null
  /** Rings branched straight from this one */
  directChildrenCount?: number
  /** The Spool only: every ring under it */
  totalRings?: number | null
  isSystemRing?: boolean
  badge?: {
    id: string
    title: string
    subtitle?: string | null
    templateId?: string | null
    backgroundColor: string
    textColor: string
    imageUrl?: string | null
    isActive: boolean
  } | null
  /** The ring's owner, when they live here */
  host?: { username: string; displayName: string | null } | null
  /** Its badge is one the old generator drew, from before the badge styles: its host is offered them */
  oldBadge?: boolean
}

export type RingPageLoad =
  | { status: 'ok'; ring: RingPageRing }
  | { status: 'not-found' }
  | { status: 'slow' }

/**
 * A ring for its page. Signed as the viewer when there is one, so a private
 * ring's members see it, else unsigned. Never the local mirror row: a hub 404
 * is a 404, and a slow hub gets the copy the cache kept, or 'slow' when
 * there's none.
 */
export async function loadRingForPage(
  slug: string,
  viewerId: string | null,
  deadlineMs: number = HUB_SSR_TIMEOUT_MS
): Promise<RingPageLoad> {
  const publicClient = getPublicRingHubClient()

  // The shared cache can hold a private ring someone else could see; unsigned, that's a 404.
  const asPublic = async () => notPrivate(await cached(`ring:${slug}`, RING_FRESH_MS, RING_STALE_MS, () => publicClient.getRing(slug)))
  const asViewer = viewerId ? () => createAuthenticatedRingHubClient(viewerId).getRingAsMember(slug) : null

  const read = await raceHubCall(readAsViewer(asViewer, asPublic), deadlineMs)
  let descriptor: RingDescriptor
  if (read === HUB_TIMEOUT) {
    const kept = await keptRing(slug)
    if (!kept) return { status: 'slow' }
    descriptor = kept
  } else if (!read) {
    return { status: 'not-found' }
  } else {
    descriptor = read
  }

  const isSystemRing = slug === 'spool'
  const [host, stats] = await Promise.all([
    hostOf(descriptor.ownerDid, viewerId),
    isSystemRing
      ? raceHubCall(cached('ring-hub-stats', RING_FRESH_MS, RING_STALE_MS, () => publicClient.getStats()), deadlineMs)
      : null,
  ])

  const ring = transformRingDescriptorToThreadRing(descriptor)
  return {
    status: 'ok',
    ring: {
      id: ring.id,
      slug: ring.slug,
      name: ring.name,
      description: ring.description ?? null,
      curatorNote: ring.curatorNote ?? null,
      bannerUrl: ring.bannerUrl ?? null,
      themeColor: ring.themeColor ?? null,
      joinType: ring.joinType,
      visibility: ring.visibility,
      memberCount: ring.memberCount,
      postCount: ring.postCount,
      createdAt: ring.createdAt,
      parentId: ring.parentId ?? null,
      directChildrenCount: descriptor.children?.length ?? 0,
      // Every ring but the Spool itself
      totalRings: stats && stats !== HUB_TIMEOUT ? Math.max(stats.totalRings - 1, 0) : null,
      isSystemRing,
      badge: ring.badge
        ? {
            ...ring.badge,
            subtitle: ring.badge.subtitle ?? null,
            templateId: ring.badge.templateId ?? null,
            imageUrl: ring.badge.imageUrl ?? null,
          }
        : null,
      host,
      oldBadge: isOldBadge(descriptor.badgeImageUrl),
    },
  }
}

/** One of our badge files that isn't a drawn badge (uploads live under media/, not badges/). */
function isOldBadge(url: string | null | undefined): boolean {
  return !!url && !!keyFromPublicUrl(url)?.startsWith('badges/') && !drawnBadgeChoice(url)
}

function notPrivate(ring: RingDescriptor | null): RingDescriptor | null {
  return ring && ring.visibility !== 'PRIVATE' ? ring : null
}

/** The ring as the hub last told anyone, without asking it again. */
async function keptRing(slug: string): Promise<RingDescriptor | null> {
  try {
    const kept = await cached<RingDescriptor | null>(`ring:${slug}`, Infinity, Infinity, () =>
      Promise.reject(new Error('not kept'))
    )
    // Kept for someone who may be a member; whoever this is might not be.
    return notPrivate(kept)
  } catch {
    return null
  }
}

/** The owner's name and address, unless they're hidden from this viewer. */
async function hostOf(ownerDid: string | undefined, viewerId: string | null): Promise<RingPageRing['host']> {
  if (!ownerDid) return null
  return (await residentsByDid([ownerDid], viewerId)).get(ownerDid) ?? null
}

/**
 * Residents here behind these DIDs, by DID: username and display name. Anyone
 * hidden from this viewer, and anyone who doesn't live here, is left out.
 */
export async function residentsByDid(
  dids: string[],
  viewerId: string | null
): Promise<Map<string, { username: string; displayName: string | null }>> {
  const found = new Map<string, { username: string; displayName: string | null }>()
  try {
    const userIds = await mapDIDsToUserIds([...new Set(dids)])
    const ids = [...new Set(userIds.values())]
    if (ids.length === 0) return found
    const users = await db.user.findMany({
      where: { AND: [{ id: { in: ids } }, visibleResidentWhere(viewerId)] },
      select: { id: true, primaryHandle: true, profile: { select: { displayName: true } } },
    })
    const byId = new Map(users.map((user) => [user.id, user]))
    for (const [did, userId] of userIds) {
      const user = byId.get(userId)
      const username = usernameFromHandle(user?.primaryHandle)
      if (username) found.set(did, { username, displayName: user?.profile?.displayName ?? null })
    }
  } catch {
    // Names are a nicety: without them, nobody is named
  }
  return found
}
