/**
 * ThreadRings as signposts on the street (pixel homes Phase 5).
 *
 * Between the houses, a ring that two or more of the street's residents
 * belong to gets a little sign: its real 88×31 badge, linked to the ring,
 * with prev / random / next through the ring's member homes, webring style
 * (pages/neighborhood/walk.tsx).
 *
 * Ring membership lives on RingHub, so it's read from there, never copied
 * into ThreadStead's database:
 *  - each resident's rings come from the hub's public badges endpoint
 *    (GET /trp/actors/:did/badges, the same read the house page's ring
 *    badges use), and a ring's badge from GET /trp/rings/:slug;
 *  - both go through the in-process SWR cache (lib/api/ringhub/ringhub-cache)
 *    for minutes, so the street costs the hub nothing on most page views;
 *  - all of it runs under one short deadline. A slow or down hub means fewer
 *    signs, or none, and never a slow or broken street. Lookups that miss the
 *    deadline keep running and fill the cache for the next visitor.
 *
 * Only PUBLIC rings get a sign, only the homes this viewer may see count
 * (the caller passes those), and rings the viewer has blocked are left out.
 * The street page asks once per street; no lot makes a request of its own.
 */
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { getPublicRingHubClient, type RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { featureFlags } from '@/lib/utils/features/feature-flags'

/** How long the street waits on the hub, in all, before drawing without it. */
export const STREET_HUB_DEADLINE_MS = 1500
/** Residents' rings and ring badges are fresh this long, then served stale while refreshed. */
export const RING_CACHE_FRESH_MS = 10 * 60 * 1000
export const RING_CACHE_STALE_MS = 6 * 60 * 60 * 1000
/** Signs on one street, so a busy street stays a street. */
export const MAX_RING_SIGNS = 4
/** Residents of a street a ring needs before it gets a sign. */
export const MIN_MEMBERS_FOR_SIGN = 2

export interface RingRef {
  slug: string
  name: string
}

export interface RingSign {
  slug: string
  name: string
  /** The ring's own 88×31 badge, or null to draw one from its name. */
  badgeImageUrl: string | null
  /** The sign stands right after this house (its first member on the street). */
  afterUserId: string
  afterNumber: number
  /** Residents of this street in the ring (shown to no one; it orders the signs). */
  membersHere: number
}

type Db = Pick<PrismaClient, 'userDID' | 'userBlock'>
type HubReader = Pick<RingHubClient, 'getActorBadges' | 'getRing'>

export interface StreetHomeRef {
  userId: string
  number: number
}

/** Settle each promise or give up on it at `deadline` (ms epoch). Never rejects. */
async function settleBy<T>(promises: Promise<T>[], deadline: number): Promise<Array<T | undefined>> {
  const left = Math.max(0, deadline - Date.now())
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeUp = new Promise<'late'>((resolve) => {
    timer = setTimeout(() => resolve('late'), left)
  })
  try {
    return await Promise.all(
      promises.map((p) =>
        Promise.race([p.catch(() => undefined), timeUp]).then((v) => (v === 'late' ? undefined : (v as T | undefined)))
      )
    )
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** A resident's PUBLIC rings, from their active hub badges. Cached per DID. */
export function publicRingsOf(hub: HubReader, did: string): Promise<RingRef[]> {
  return cached(`street-rings:actor:${did}`, RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS, async () => {
    const { badges } = await hub.getActorBadges(did, { status: 'active', limit: 100 })
    const rings = new Map<string, RingRef>()
    for (const b of badges) {
      if (b.isRevoked || b.ring.visibility !== 'PUBLIC') continue
      if (b.membership.status && b.membership.status !== 'ACTIVE') continue
      rings.set(b.ring.slug, { slug: b.ring.slug, name: b.ring.name })
    }
    return [...rings.values()]
  })
}

/**
 * Which rings get a sign on this street, and where: rings with at least
 * MIN_MEMBERS_FOR_SIGN residents here, the ones with the most residents here
 * first (then by name), at most MAX_RING_SIGNS, each standing after its first
 * member's house. Pure, so the rules are easy to test.
 */
export function planRingSigns(
  homes: StreetHomeRef[],
  ringsByUser: Map<string, RingRef[]>,
  blockedSlugs: Set<string> = new Set()
): Omit<RingSign, 'badgeImageUrl'>[] {
  const ordered = [...homes].sort((a, b) => a.number - b.number)
  const bySlug = new Map<string, { ring: RingRef; members: StreetHomeRef[] }>()
  for (const home of ordered) {
    for (const ring of ringsByUser.get(home.userId) ?? []) {
      if (blockedSlugs.has(ring.slug)) continue
      const entry = bySlug.get(ring.slug) ?? { ring, members: [] }
      entry.members.push(home)
      bySlug.set(ring.slug, entry)
    }
  }
  return [...bySlug.values()]
    .filter((e) => e.members.length >= MIN_MEMBERS_FOR_SIGN)
    .sort((a, b) => b.members.length - a.members.length || a.ring.name.localeCompare(b.ring.name))
    .slice(0, MAX_RING_SIGNS)
    .map((e) => ({
      slug: e.ring.slug,
      name: e.ring.name,
      afterUserId: e.members[0].userId,
      afterNumber: e.members[0].number,
      membersHere: e.members.length,
    }))
    .sort((a, b) => a.afterNumber - b.afterNumber || a.name.localeCompare(b.name))
}

/** Slugs of the rings this viewer blocked (blocks name a local ThreadRing row). */
async function blockedRingSlugs(db: Db, viewerId: string | null | undefined): Promise<Set<string>> {
  if (!viewerId) return new Set()
  const blocks = await db.userBlock.findMany({
    where: { blockerId: viewerId, blockedThreadRingId: { not: null } },
    select: { blockedThreadRing: { select: { slug: true } } },
  })
  return new Set(blocks.map((b) => b.blockedThreadRing?.slug).filter((s): s is string => !!s))
}

const RingBadgeFields = z.object({
  visibility: z.string().optional(),
  badgeImageUrl: z.string().nullish(),
  badgeImageHighResUrl: z.string().nullish(),
})

/**
 * The ring signs for one street of homes the viewer may see. Never throws
 * and never waits on the hub past the deadline: on any trouble it returns
 * fewer signs, or none.
 */
export async function getStreetRingSigns(
  db: Db,
  homes: StreetHomeRef[],
  {
    viewerId,
    hub,
    deadlineMs = STREET_HUB_DEADLINE_MS,
  }: { viewerId?: string | null; hub?: HubReader | null; deadlineMs?: number } = {}
): Promise<RingSign[]> {
  if (homes.length < MIN_MEMBERS_FOR_SIGN) return []
  try {
    const client = hub !== undefined ? hub : featureFlags.ringhub() ? getPublicRingHubClient() : null
    if (!client) return []
    const deadline = Date.now() + deadlineMs

    // Read-only: a resident with no DID row has never joined a ring
    const [dids, blocked] = await Promise.all([
      db.userDID.findMany({ where: { userId: { in: homes.map((h) => h.userId) } }, select: { userId: true, did: true } }),
      blockedRingSlugs(db, viewerId),
    ])
    if (dids.length < MIN_MEMBERS_FOR_SIGN) return []

    const rings = await settleBy(dids.map((d) => publicRingsOf(client, d.did)), deadline)
    const ringsByUser = new Map<string, RingRef[]>()
    dids.forEach((d, i) => {
      const list = rings[i]
      if (list) ringsByUser.set(d.userId, list)
    })

    const plan = planRingSigns(homes, ringsByUser, blocked)
    if (plan.length === 0) return []

    // The badge each ring shows today. A ring that has since gone private or
    // been deleted loses its sign; one whose descriptor is late keeps a sign
    // drawn from its name.
    const descriptors = await settleBy(
      plan.map((s) =>
        cached(`ring:${s.slug}`, RING_CACHE_FRESH_MS, RING_CACHE_STALE_MS, () => client.getRing(s.slug))
      ),
      Math.max(deadline, Date.now() + 300)
    )
    const signs: RingSign[] = []
    plan.forEach((s, i) => {
      const d = descriptors[i]
      if (d === null) return // the hub says there's no such ring
      const fields = d ? RingBadgeFields.safeParse(d) : null
      const ring = fields?.success ? fields.data : null
      if (ring?.visibility && ring.visibility !== 'PUBLIC') return
      signs.push({ ...s, badgeImageUrl: ring?.badgeImageUrl || ring?.badgeImageHighResUrl || null })
    })
    return signs
  } catch (error) {
    console.warn('Street ring signs skipped:', error instanceof Error ? error.message : error)
    return []
  }
}
