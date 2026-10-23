/**
 * A ring's stops, for strips on members' own sites (design/rings-for-any-
 * site/SCOPE.md §3): every ACTIVE hub member who is a visible, active
 * resident here, in house-number order (the ring street's order). A
 * member's stop is their own site when it's proved, healthy and listed in
 * this ring; otherwise their pixel home. So a visitor is never stranded,
 * and the walk keeps passing through homes here.
 *
 * The hub only says who is in the ring (the members list ring-walk already
 * reads); where each stop is lives here (RingStop). Redirect targets come
 * from these rows only, never from the request.
 */
import type { PrismaClient, RingOutsideSites } from '@prisma/client'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { getPublicRingHubClient, type RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { visibleResidentWhere } from '@/lib/domain/users/profile-access'
import { houseNumbersOf } from '@/lib/pixel-homes/street'
import { pickWalkTarget, ringMemberDids, WALK_DEADLINE_MS, type WalkDirection } from '@/lib/pixel-homes/ring-walk'
import { RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS } from '@/lib/pixel-homes/street-rings'

export type HubReader = Pick<RingHubClient, 'getRingMembers' | 'getRing'>

export interface RingFacts {
  slug: string
  name: string
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  joinPolicy: 'OPEN' | 'APPLICATION' | 'INVITATION' | 'CLOSED'
  badgeImageUrl: string | null
  /** Its theme colour, which its drawn badge is in */
  themeColor: string | null
}

export function defaultHub(): HubReader {
  return getPublicRingHubClient()
}

/** The ring's name, visibility and join rule (cached like the street's ring reads); null when the hub has no such ring. */
export async function ringFacts(hub: HubReader, slug: string): Promise<RingFacts | null> {
  const ring = await cached(`ring:${slug}`, RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS, () => hub.getRing(slug))
  if (!ring) return null
  return {
    slug: ring.slug,
    name: ring.name,
    visibility: ring.visibility,
    joinPolicy: ring.joinPolicy,
    badgeImageUrl: badgeUrlOf(ring),
    themeColor: ring.themeColor ?? null,
  } as RingFacts
}

/** A hub ring's badge image, when it's a web address. */
export function badgeUrlOf(ring: { badgeImageUrl?: string | null; badgeImageHighResUrl?: string | null }): string | null {
  const badge = ring.badgeImageUrl || ring.badgeImageHighResUrl || null
  return badge && /^https?:\/\//i.test(badge) ? badge : null
}

/** The ring's rule for outside sites: its own setting, else its join rule (open rings allow, others ask). */
export async function outsideSitesRule(
  db: Pick<PrismaClient, 'ringSiteSettings'>,
  ring: Pick<RingFacts, 'slug' | 'joinPolicy'>
): Promise<RingOutsideSites> {
  const row = await db.ringSiteSettings.findUnique({ where: { ringSlug: ring.slug } })
  return row?.outsideSites ?? (ring.joinPolicy === 'OPEN' ? 'allow' : 'ask')
}

/** Members' own sites that are their stops in this ring (listed, proved, and the ring takes them), by member. */
export async function stopSites(
  db: Pick<PrismaClient, 'ringStop' | 'ringSiteSettings'>,
  ring: Pick<RingFacts, 'slug' | 'joinPolicy'>,
  userIds: string[]
): Promise<Map<string, NonNullable<RingStopView['site']>>> {
  if (userIds.length === 0 || (await outsideSitesRule(db, ring)) === 'off') return new Map()
  const rows = await db.ringStop.findMany({
    where: { ringSlug: ring.slug, status: 'listed', userId: { in: userIds }, site: { state: 'verified' } },
    select: { userId: true, site: { select: { id: true, url: true, title: true, siteRef: true } } },
  })
  return new Map(rows.map((s) => [s.userId, s.site]))
}

export interface RingStopView {
  userId: string
  handle: string
  displayName: string | null
  number: number
  /** Their own site, when it's their stop in this ring. */
  site: { id: string; url: string; title: string | null; siteRef: string } | null
}

type Db = Pick<PrismaClient, '$queryRaw' | 'user' | 'userHomeConfig' | 'userDID' | 'ringStop' | 'ringSiteSettings'>

export type StopsResult =
  | { kind: 'stops'; ring: RingFacts; stops: RingStopView[] }
  /** No such ring, or not a public one. */
  | { kind: 'none' }
  /** The hub didn't answer in time. */
  | { kind: 'unavailable' }

/** Every stop of a public ring this viewer may see, in order. */
export async function ringStops(
  db: Db,
  {
    slug,
    viewerId,
    host,
    hub = defaultHub(),
    deadlineMs = WALK_DEADLINE_MS,
  }: { slug: string; viewerId: string | null | undefined; host: string; hub?: HubReader; deadlineMs?: number }
): Promise<StopsResult> {
  const read = await raceHubCall(Promise.all([ringFacts(hub, slug), ringMemberDids(hub, slug)]), deadlineMs)
  if (read === HUB_TIMEOUT) return { kind: 'unavailable' }
  const [ring, dids] = read
  // Strips are for public rings only (owner decision 2026-10-22)
  if (!ring || ring.visibility !== 'PUBLIC' || !dids) return { kind: 'none' }
  if (dids.length === 0) return { kind: 'stops', ring, stops: [] }

  // Read-only: members from other instances simply have no row here
  const local = await db.userDID.findMany({ where: { did: { in: dids } }, select: { userId: true } })
  const visible = await db.user.findMany({
    where: { AND: [{ id: { in: local.map((r) => r.userId) } }, visibleResidentWhere(viewerId)] },
    select: {
      id: true,
      handles: { where: { host }, select: { handle: true }, take: 1 },
      profile: { select: { displayName: true } },
    },
  })
  const numbers = await houseNumbersOf(db, visible.map((u) => u.id), host)
  const sites = await stopSites(db, ring, [...numbers.keys()])

  const stops = visible
    .filter((u) => u.handles[0] && numbers.has(u.id))
    .map((u) => ({
      userId: u.id,
      handle: u.handles[0].handle,
      displayName: u.profile?.displayName ?? null,
      number: numbers.get(u.id)!,
      site: sites.get(u.id) ?? null,
    }))
    .sort((a, b) => a.number - b.number)
  return { kind: 'stops', ring, stops }
}

export type SiteWalkResult =
  | { kind: 'stop'; stop: RingStopView; fromSite: { id: string; userId: string } | null }
  /** A public ring with no stops this side (none of its members live here). */
  | { kind: 'empty'; fromSite: { id: string; userId: string } | null }
  | { kind: 'none' }
  | { kind: 'unavailable' }

/**
 * Where a strip's prev / random / next goes from the site with id `from`.
 * From a site we don't know (or whose owner isn't a stop here), next starts
 * at the first stop, prev at the last, and random goes anywhere.
 */
export async function walkFromSite(
  db: Db & Pick<PrismaClient, 'externalSite'>,
  {
    slug,
    from,
    go,
    host,
    hub,
    deadlineMs,
    random,
  }: {
    slug: string
    from: string | null
    go: WalkDirection
    host: string
    hub?: HubReader
    deadlineMs?: number
    random?: () => number
  }
): Promise<SiteWalkResult> {
  // Strangers' view: a member whose profile isn't public isn't a stop (it would reveal their membership)
  const result = await ringStops(db, { slug, viewerId: null, host, hub, deadlineMs })
  if (result.kind !== 'stops') return result

  const fromSite = from ? await db.externalSite.findUnique({ where: { id: from }, select: { id: true, userId: true } }) : null
  const here = fromSite ? result.stops.find((s) => s.userId === fromSite.userId) : undefined
  // pickWalkTarget's prev counts the house it's given (a signpost stands after it); a site's prev is the stop before
  const at = here ? (go === 'prev' ? here.number - 1 : here.number) : 0
  const target = pickWalkTarget(result.stops, at, go, random)
  return target ? { kind: 'stop', stop: target, fromSite } : { kind: 'empty', fromSite }
}
