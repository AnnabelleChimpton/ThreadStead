/**
 * A ThreadRing's street: its members' pixel homes, each with the house
 * number it has on the main street (pages/neighborhood/ring/[slug].tsx).
 *
 * With Ring Hub on, the ring and its members come from the hub's public
 * reads, cached and bounded like the street's ring signs and the ring walk
 * (lib/pixel-homes/ring-walk.ts), so only PUBLIC rings have a street.
 * ThreadStead keeps no copy of who's in a ring. With Ring Hub off, the local
 * ThreadRing tables answer instead.
 */
import type { PrismaClient } from '@prisma/client'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { getPublicRingHubClient, type RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { getHomesOf, type StreetHome } from './street'
import { ringMemberDids, WALK_DEADLINE_MS } from './ring-walk'
import { RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS } from './street-rings'

export interface RingStreetRing {
  slug: string
  name: string
  description: string | null
}

export type RingStreet =
  | { kind: 'street'; ring: RingStreetRing; homes: StreetHome[] }
  /** No such public ring */
  | { kind: 'none' }
  /** The hub didn't answer in time */
  | { kind: 'unavailable' }

type Db = Parameters<typeof getHomesOf>[0] & Pick<PrismaClient, 'userDID' | 'threadRing'>
type HubReader = Pick<RingHubClient, 'getRing' | 'getRingMembers'>

export async function getRingStreet(
  db: Db,
  {
    slug,
    viewerId,
    host,
    hub,
    deadlineMs = WALK_DEADLINE_MS,
  }: {
    slug: string
    viewerId: string | null | undefined
    host: string
    hub?: HubReader | null
    deadlineMs?: number
  }
): Promise<RingStreet> {
  const client = hub !== undefined ? hub : featureFlags.ringhub() ? getPublicRingHubClient() : null

  if (!client) {
    const local = await db.threadRing.findUnique({
      where: { slug },
      select: { slug: true, name: true, description: true, visibility: true, members: { select: { userId: true } } },
    })
    if (!local || local.visibility !== 'public') return { kind: 'none' }
    const homes = await getHomesOf(db, { userIds: local.members.map((m) => m.userId), viewerId, host })
    return { kind: 'street', ring: { slug: local.slug, name: local.name, description: local.description }, homes }
  }

  const read = await raceHubCall(
    Promise.all([
      cached(`ring:${slug}`, RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS, () => client.getRing(slug)),
      ringMemberDids(client, slug),
    ]),
    deadlineMs
  )
  if (read === HUB_TIMEOUT) return { kind: 'unavailable' }
  const [descriptor, dids] = read
  if (!descriptor || descriptor.visibility !== 'PUBLIC' || dids === null) return { kind: 'none' }

  // Read-only: members from other instances simply have no row here
  const local = dids.length
    ? await db.userDID.findMany({ where: { did: { in: dids } }, select: { userId: true } })
    : []
  const homes = await getHomesOf(db, { userIds: local.map((row) => row.userId), viewerId, host })
  return {
    kind: 'street',
    ring: { slug: descriptor.slug, name: descriptor.name, description: descriptor.description ?? null },
    homes,
  }
}
