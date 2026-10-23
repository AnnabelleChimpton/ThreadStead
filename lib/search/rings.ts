/**
 * Ring lookups for search. Rings stay hub-owned (SEARCH_PLAN.md §2): with
 * Ring Hub on, the hub filters (full-text + trigram since hub 2026-10-18),
 * read live; without it, the local ThreadRing table does. Blocked rings are
 * dropped either way.
 */
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient, type RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { getUserBlockedIds } from '@/lib/domain/users/blocks'
import { escapeLike } from './query'
import type { SearchResult } from './types'
import { countOf } from '@/lib/utils/count-of'

export interface RingRow {
  id: string
  slug: string
  name: string
  description?: string | null
  memberCount?: number
  postCount?: number
  badgeImageUrl?: string | null
  /** The hub's own text/trigram scores, when it has full-text ring search. */
  relevance?: { textRank: number; trigram: number }
}

/**
 * Anonymous hub searches are the same for every visitor, so they're cached
 * this long (no stale window: a fresh search is at most a minute behind the
 * hub). Signed searches aren't cached: they carry the viewer's membership and
 * see more rings.
 */
const ANONYMOUS_CACHE_MS = 60_000

async function hubRings(
  client: Pick<RingHubClient, 'listRings'>,
  search: string,
  limit: number
): Promise<RingRow[]> {
  // With words, no sort: a full-text hub then returns best matches first (an
  // older hub, newest first; it ignored sort=members anyway). Search ranks
  // them again either way. Without words: the biggest rings.
  const { rings } = await client.listRings(search ? { search, limit } : { limit, sort: 'members', order: 'desc' })
  return rings.map((ring) => ({
    id: ring.id,
    slug: ring.slug,
    name: ring.name,
    description: ring.description,
    memberCount: ring.memberCount,
    postCount: ring.postCount,
    badgeImageUrl: ring.badgeImageUrl,
    ...(ring.relevance ? { relevance: ring.relevance } : {}),
  }))
}

/**
 * Rings matching `search`, best match first (or the biggest rings when it's
 * empty). Throws when the hub fails, so callers can report it.
 */
export async function fetchRings(opts: {
  search: string
  viewerId: string | null
  system: string
  limit: number
}): Promise<RingRow[]> {
  const { search, viewerId, system, limit } = opts
  const blockedThreadRingIds = viewerId ? (await getUserBlockedIds(viewerId)).blockedThreadRingIds : []

  if (system === 'ringhub') {
    // Anonymous viewers get the UNSIGNED public client (signing as the
    // instance DID gains nothing here and fails every call when the hub
    // can't resolve that key). A hub failure throws; a cached result from
    // before the failure may be served instead (ringhub-cache.ts).
    if (!viewerId) {
      const publicClient = getPublicRingHubClient()
      if (!publicClient) throw new Error('Ring Hub client not configured')
      return cached(`search-rings:anon:${limit}:${search}`, ANONYMOUS_CACHE_MS, ANONYMOUS_CACHE_MS, () =>
        hubRings(publicClient, search, limit)
      )
    }
    // Signed-in viewers get a user-signed client.
    const ringHubClient = createAuthenticatedRingHubClient(viewerId)
    if (!ringHubClient) throw new Error('Ring Hub client not configured')
    const rings = await hubRings(ringHubClient, search, limit)
    // UserBlock points at the local ThreadRing row; hub descriptors
    // carry the hub's id, so match blocked rings by slug.
    const blockedSlugs = new Set(
      blockedThreadRingIds.length > 0
        ? (
            await db.threadRing.findMany({
              where: { id: { in: blockedThreadRingIds } },
              select: { slug: true },
            })
          ).map((ring) => ring.slug)
        : []
    )
    return rings.filter((ring) => !blockedSlugs.has(ring.slug))
  }

  // Local ThreadRing fallback (no hub): a substring filter.
  const pattern = escapeLike(search)
  const rows = await db.threadRing.findMany({
    where: {
      AND: [
        { visibility: { in: ['public', 'unlisted'] } },
        ...(blockedThreadRingIds.length > 0 ? [{ id: { notIn: blockedThreadRingIds } }] : []),
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: pattern, mode: 'insensitive' as const } },
                  { description: { contains: pattern, mode: 'insensitive' as const } },
                  { slug: { contains: pattern, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      memberCount: true,
      postCount: true,
      badge: { select: { imageUrl: true, isActive: true } },
    },
    orderBy: [{ memberCount: 'desc' }, { postCount: 'desc' }],
    take: limit,
  })
  return rows.map(({ badge, ...ring }) => ({ ...ring, badgeImageUrl: badge?.isActive ? badge.imageUrl : null }))
}

/** A ring as a search result card. */
export function ringResult(ring: RingRow): Omit<SearchResult, 'relevanceScore'> {
  return {
    type: 'threadring',
    id: ring.id,
    title: ring.name,
    description: ring.description || undefined,
    url: `/tr/${ring.slug}`,
    meta: `${countOf(ring.memberCount || 0, 'member')} • ${countOf(ring.postCount || 0, 'post')}`,
    ring: {
      slug: ring.slug,
      badgeImageUrl: ring.badgeImageUrl || null,
      memberCount: ring.memberCount || 0,
      postCount: ring.postCount || 0,
    },
  }
}
