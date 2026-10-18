/**
 * Ring lookups for search. Rings stay hub-owned (SEARCH_PLAN.md §2): with
 * Ring Hub on, the hub filters; without it, the local ThreadRing table does.
 * Blocked rings are dropped either way.
 */
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { getUserBlockedIds } from '@/lib/domain/users/blocks'
import { escapeLike } from './query'
import type { SearchResult } from './types'

export interface RingRow {
  id: string
  slug: string
  name: string
  description?: string | null
  memberCount?: number
  postCount?: number
  badgeImageUrl?: string | null
}

/**
 * Rings matching `search` (or the biggest rings when it's empty), most
 * members first. Throws when the hub fails, so callers can report it.
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
    // Signed-in viewers get a user-signed client; anonymous ones the
    // UNSIGNED public client (signing as the instance DID gains nothing
    // here and fails every call when the hub can't resolve that key).
    const ringHubClient = viewerId ? createAuthenticatedRingHubClient(viewerId) : getPublicRingHubClient()
    if (!ringHubClient) throw new Error('Ring Hub client not configured')
    const ringResult = await ringHubClient.listRings({
      ...(search ? { search } : {}),
      limit,
      sort: 'members',
      order: 'desc',
    })
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
    return ringResult.rings.filter((descriptor: RingRow) => !blockedSlugs.has(descriptor.slug))
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
    meta: `${ring.memberCount || 0} members • ${ring.postCount || 0} posts`,
    ring: {
      slug: ring.slug,
      badgeImageUrl: ring.badgeImageUrl || null,
      memberCount: ring.memberCount || 0,
      postCount: ring.postCount || 0,
    },
  }
}
