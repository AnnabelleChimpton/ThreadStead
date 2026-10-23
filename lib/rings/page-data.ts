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
  if (!publicClient) return { status: 'slow' }

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
    },
  }
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
  try {
    const userId = (await mapDIDsToUserIds([ownerDid])).get(ownerDid)
    if (!userId) return null
    const user = await db.user.findFirst({
      where: { AND: [{ id: userId }, visibleResidentWhere(viewerId)] },
      select: { primaryHandle: true, profile: { select: { displayName: true } } },
    })
    const username = usernameFromHandle(user?.primaryHandle)
    return username ? { username, displayName: user?.profile?.displayName ?? null } : null
  } catch {
    return null
  }
}
