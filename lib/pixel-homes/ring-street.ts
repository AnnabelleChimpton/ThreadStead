/**
 * A ThreadRing's street: its members' pixel homes, each with the house
 * number it has on the main street (pages/neighborhood/ring/[slug].tsx).
 *
 * With Ring Hub on, the ring and its members come from the hub's public
 * reads, cached and bounded like the street's ring signs and the ring walk
 * (lib/pixel-homes/ring-walk.ts), so only PUBLIC rings have a street.
 * ThreadStead keeps no copy of who's in a ring. With Ring Hub off, the local
 * ThreadRing tables answer instead.
 *
 * The street is also the one list of a ring's people (owner decision
 * 2026-10-23): everyone in it, with their role, house number and their own
 * site when it's their stop, in the walk's order (lib/rings/walk.ts).
 */
import type { PrismaClient } from '@prisma/client'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { getPublicRingHubClient, type RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { getHomesOf, type StreetHome } from './street'
import { ringMembers, WALK_DEADLINE_MS, type HubRingMember } from './ring-walk'
import { RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS } from './street-rings'
import { visibleResidentWhere } from '@/lib/domain/users/profile-access'
import { badgeUrlOf, stopSites, type RingFacts } from '@/lib/rings/walk'
import { siteAddress } from '@/lib/rings/sites'

export interface RingStreetRing {
  slug: string
  name: string
  description: string | null
  /** For the street's link preview (lib/share-images); the hub's only */
  badgeImageUrl: string | null
}

export interface RingPerson {
  /** Their id here, or their DID when they're from another instance */
  key: string
  name: string
  role: 'host' | 'moderator' | 'member'
  /** Their handle here; null for someone from another instance */
  handle: string | null
  /** Their house number, when they have a home this viewer may visit */
  number: number | null
  /** Their profile on their own instance, for someone from elsewhere */
  profileUrl: string | null
  /** Their own site, when it's their stop in this ring */
  site: { id: string; url: string; title: string | null; address: string } | null
}

export type RingStreet =
  | { kind: 'street'; ring: RingStreetRing; homes: StreetHome[]; people: RingPerson[] }
  /** No such public ring */
  | { kind: 'none' }
  /** The hub didn't answer in time */
  | { kind: 'unavailable' }

type Db = Parameters<typeof getHomesOf>[0] &
  Pick<PrismaClient, 'userDID' | 'threadRing' | 'ringHubOwnership' | 'ringStop' | 'ringSiteSettings'>
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
    const people = homes.map((h) => ({
      key: h.userId,
      name: h.displayName || h.username,
      role: 'member' as const,
      handle: h.username,
      number: h.number,
      profileUrl: null,
      site: null,
    }))
    return { kind: 'street', ring: { slug: local.slug, name: local.name, description: local.description, badgeImageUrl: null }, homes, people }
  }

  const read = await raceHubCall(
    Promise.all([
      cached(`ring:${slug}`, RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS, () => client.getRing(slug)),
      ringMembers(client, slug),
    ]),
    deadlineMs
  )
  if (read === HUB_TIMEOUT) return { kind: 'unavailable' }
  const [descriptor, members] = read
  if (!descriptor || descriptor.visibility !== 'PUBLIC' || members === null) return { kind: 'none' }

  // Read-only: members from other instances simply have no row here
  const local = members.length
    ? await db.userDID.findMany({ where: { did: { in: members.map((m) => m.did) } }, select: { did: true, userId: true } })
    : []
  const homes = await getHomesOf(db, { userIds: local.map((row) => row.userId), viewerId, host })
  const people = await peopleOf(db, { ring: descriptor, members, local, homes, viewerId, host })
  return {
    kind: 'street',
    ring: { slug: descriptor.slug, name: descriptor.name, description: descriptor.description ?? null, badgeImageUrl: badgeUrlOf(descriptor) },
    homes,
    people,
  }
}

const ROLE_ORDER = { host: 0, moderator: 1, member: 2 }

/**
 * Everyone in the ring this viewer may see: residents here by the lists'
 * usual rules (visibleResidentWhere), and members from other instances by
 * the name the hub has. Homes first in house-number order (the walk's),
 * then everyone without one, hosts and moderators first.
 */
async function peopleOf(
  db: Db,
  {
    ring,
    members,
    local,
    homes,
    viewerId,
    host,
  }: {
    ring: Pick<RingFacts, 'slug' | 'joinPolicy'> & { ownerDid?: string }
    members: HubRingMember[]
    local: Array<{ did: string; userId: string }>
    homes: StreetHome[]
    viewerId: string | null | undefined
    host: string
  }
): Promise<RingPerson[]> {
  const userOf = new Map(local.map((row) => [row.did, row.userId]))
  // A ring this site holds on the hub for a resident: they're its host
  const siteDid = process.env.THREADSTEAD_DID
  const heldFor =
    siteDid && ring.ownerDid === siteDid
      ? (await db.ringHubOwnership.findUnique({ where: { ringSlug: ring.slug }, select: { ownerUserId: true } }))?.ownerUserId
      : null

  const residents = await db.user.findMany({
    where: { AND: [{ id: { in: [...userOf.values()] } }, visibleResidentWhere(viewerId)] },
    select: { id: true, handles: { where: { host }, select: { handle: true }, take: 1 }, profile: { select: { displayName: true } } },
  })
  const residentById = new Map(residents.map((r) => [r.id, r]))
  const numberOf = new Map(homes.map((h) => [h.userId, h.number]))
  const sites = await stopSites(db, ring, [...numberOf.keys()])

  const people: RingPerson[] = []
  for (const member of members) {
    if (member.did === siteDid) continue
    const userId = userOf.get(member.did)
    const resident = userId ? residentById.get(userId) : undefined
    if (userId && !resident) continue // not someone this viewer may see listed
    const role = member.role === 'owner' || (userId && userId === heldFor) ? 'host' : member.role
    const handle = resident?.handles[0]?.handle ?? null
    const site = userId ? sites.get(userId) : undefined
    people.push({
      key: userId ?? member.did,
      name: resident?.profile?.displayName || handle || member.name || 'Someone from another site',
      role,
      handle,
      number: (userId && numberOf.get(userId)) || null,
      profileUrl: resident ? null : member.profileUrl,
      site: site ? { id: site.id, url: site.url, title: site.title, address: siteAddress(site.url) } : null,
    })
  }
  return people.sort(
    (a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
  )
}
