/**
 * Walking a ThreadRing's homes from a signpost on the street, webring style:
 * prev, random and next through the ring's members who have a pixel home,
 * in house-number order, wrapping round at the ends
 * (pages/neighborhood/walk.tsx, lib/pixel-homes/street-rings.ts).
 *
 * Members come from RingHub (GET /trp/rings/:slug/members, paged), cached
 * like the street's ring reads and bounded by a deadline. ThreadStead keeps
 * no copy. Only homes the viewer may see are walked to.
 */
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { RingHubClientError, getPublicRingHubClient, type RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { visibleResidentWhere } from '@/lib/domain/users/profile-access'
import { houseNumbersOf } from './street'
import { RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS } from './street-rings'

export type WalkDirection = 'next' | 'prev' | 'random'

/** Pages of 100 read at most, so a huge ring can't hold up a click. */
export const MAX_MEMBER_PAGES = 10
const PAGE_SIZE = 100
export const WALK_DEADLINE_MS = 3000

/** What the walk reads from the hub's members list (rings.ts, GET /rings/:slug/members). */
const MembersPage = z.object({
  members: z.array(z.object({ actorDid: z.string(), status: z.string().nullish() })),
  hasMore: z.boolean(),
})

type HubReader = Pick<RingHubClient, 'getRingMembers'>

/** Every ACTIVE member's DID, or null when the hub has no such (public) ring. Cached per ring. */
export function ringMemberDids(hub: HubReader, slug: string): Promise<string[] | null> {
  return cached(`street-rings:members:${slug}`, RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS, async () => {
    const dids = new Set<string>()
    for (let page = 0; page < MAX_MEMBER_PAGES; page++) {
      let raw: unknown
      try {
        raw = await hub.getRingMembers(slug, { limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      } catch (error) {
        // Missing and private rings both answer 404 to an unsigned read
        if (error instanceof RingHubClientError && error.status === 404) return null
        throw error
      }
      const parsed = MembersPage.parse(raw)
      for (const m of parsed.members) if (!m.status || m.status === 'ACTIVE') dids.add(m.actorDid)
      if (!parsed.hasMore) break
    }
    return [...dids]
  })
}

/**
 * The member home to go to from a sign standing after house `from`: next is
 * the first member past it, prev the last one at or before it, both wrapping
 * round; random is any member. null when there are none.
 */
export function pickWalkTarget<T extends { number: number }>(
  members: T[],
  from: number,
  go: WalkDirection,
  random: () => number = Math.random
): T | null {
  if (members.length === 0) return null
  const ordered = [...members].sort((a, b) => a.number - b.number)
  if (go === 'random') return ordered[Math.floor(random() * ordered.length) % ordered.length]
  if (go === 'next') return ordered.find((m) => m.number > from) ?? ordered[0]
  return [...ordered].reverse().find((m) => m.number <= from) ?? ordered[ordered.length - 1]
}

type Db = Pick<PrismaClient, '$queryRaw' | 'user' | 'userHomeConfig' | 'userDID'>

export type WalkResult =
  | { kind: 'home'; handle: string }
  /** No member home this viewer may visit (or no such public ring). */
  | { kind: 'none' }
  /** The hub didn't answer in time, or isn't configured. */
  | { kind: 'unavailable' }

/** Where the walk goes from a sign. */
export async function walkTarget(
  db: Db,
  {
    slug,
    from,
    go,
    viewerId,
    host,
    hub,
    deadlineMs = WALK_DEADLINE_MS,
    random,
  }: {
    slug: string
    from: number
    go: WalkDirection
    viewerId: string | null | undefined
    host: string
    hub?: HubReader | null
    deadlineMs?: number
    random?: () => number
  }
): Promise<WalkResult> {
  const client = hub !== undefined ? hub : featureFlags.ringhub() ? getPublicRingHubClient() : null
  if (!client) return { kind: 'unavailable' }

  const dids = await raceHubCall(ringMemberDids(client, slug), deadlineMs)
  if (dids === HUB_TIMEOUT) return { kind: 'unavailable' }
  if (!dids || dids.length === 0) return { kind: 'none' }

  // Read-only: members from other instances simply have no row here
  const local = await db.userDID.findMany({ where: { did: { in: dids } }, select: { userId: true } })
  const userIds = local.map((row) => row.userId)
  if (userIds.length === 0) return { kind: 'none' }

  const visible = await db.user.findMany({
    where: { AND: [{ id: { in: userIds } }, visibleResidentWhere(viewerId)] },
    select: { id: true, handles: { where: { host }, select: { handle: true }, take: 1 } },
  })
  const numbers = await houseNumbersOf(db, visible.map((u) => u.id), host)
  const homes = visible
    .filter((u) => u.handles[0] && numbers.has(u.id))
    .map((u) => ({ handle: u.handles[0].handle, number: numbers.get(u.id)! }))

  const target = pickWalkTarget(homes, from, go, random)
  return target ? { kind: 'home', handle: target.handle } : { kind: 'none' }
}
