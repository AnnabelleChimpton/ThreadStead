/**
 * A member's own site as their stop in one ring (RingStop), and what the
 * ring's host can do about it (SCOPE.md §4; host only, owner decision
 * 2026-10-23: moderators look after people and prompts).
 *
 * Outside sites follow the ring's join rule unless its owner set one
 * (owner decision 2026-10-22): open rings list a proved site right away and
 * can hide it after; invitation rings hold it as pending until the host
 * says yes. Hiding is kept here, for good: the member falls back to their
 * pixel home and is told plainly.
 *
 * The hub says who is in a ring and who runs it. Membership is the
 * member's own signed list (my memberships); the host comes from the public
 * members list, read fresh by role, or from RingHubOwnership for a ring this
 * site holds on the hub for a resident (as in ring-access.ts).
 */
import type { ExternalSite, PrismaClient, RingOutsideSites, RingStop } from '@prisma/client'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { notifyRingSite } from './notify'
import { SiteError } from './sites'
import { outsideSitesRule, ringFacts, type HubReader, type RingFacts } from './walk'

export interface MyRing {
  slug: string
  name: string
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  role: string | null
}

type MembershipReader = () => Promise<MyRing[]>

/** The rings this resident is an ACTIVE member of, from their own signed list (fresh for 30s). */
export function myRings(userId: string): Promise<MyRing[]> {
  return cached(`ring-stops:my-rings:${userId}`, 30_000, 5 * 60_000, async () => {
    const client = createAuthenticatedRingHubClient(userId)
    const out: MyRing[] = []
    for (let offset = 0; offset < 1000; offset += 50) {
      const page = await client.getMyMemberships({ status: 'ACTIVE', limit: 50, offset })
      for (const m of page.memberships) {
        out.push({ slug: m.ringSlug, name: m.ringName, visibility: m.ringVisibility, role: m.role })
      }
      if (!page.hasMore || page.memberships.length < 50) break
    }
    return out
  })
}

type HostDb = Pick<PrismaClient, 'userDID' | 'ringHubOwnership'>

/** The local resident(s) who host this ring, read fresh. */
export async function ringHosts(db: HostDb, hub: Pick<HubReader, 'getRingMembers'>, slug: string): Promise<string[]> {
  const { members } = await hub.getRingMembers(slug, { limit: 100, role: 'owner' })
  const dids = members.filter((m) => m.status === 'ACTIVE').map((m) => m.actorDid)
  if (dids.length === 0) return []
  const rows = await db.userDID.findMany({ where: { did: { in: dids } }, select: { userId: true } })
  const hosts = rows.map((r) => r.userId)
  const siteDid = process.env.THREADSTEAD_DID
  if (siteDid && dids.includes(siteDid)) {
    const held = await db.ringHubOwnership.findUnique({ where: { ringSlug: slug }, select: { ownerUserId: true } })
    if (held) hosts.push(held.ownerUserId)
  }
  return [...new Set(hosts)]
}

export async function isRingHost(db: HostDb, hub: Pick<HubReader, 'getRingMembers'>, slug: string, userId: string): Promise<boolean> {
  return (await ringHosts(db, hub, slug)).includes(userId)
}

/** What a site's stop in a new ring starts as, by the ring's rule. */
export function firstStatus(rule: RingOutsideSites): 'listed' | 'pending' | null {
  return rule === 'allow' ? 'listed' : rule === 'ask' ? 'pending' : null
}

/**
 * Make `site` its owner's stop in `ringSlug`, or stop that. A ring holds one
 * site per member; choosing another site moves the stop (unless a ring
 * owner hid the old one: that stays theirs to lift).
 */
export async function setStop(
  db: PrismaClient,
  {
    userId,
    site,
    ringSlug,
    on,
    hub,
    memberships = () => myRings(userId),
  }: { userId: string; site: ExternalSite; ringSlug: string; on: boolean; hub: HubReader; memberships?: MembershipReader }
): Promise<RingStop | null> {
  if (site.userId !== userId) throw new SiteError('Not your site.', 404)
  const existing = await db.ringStop.findUnique({ where: { ringSlug_userId: { ringSlug, userId } } })

  if (!on) {
    if (!existing || existing.externalSiteId !== site.id) return null
    if (existing.status === 'hidden') throw new SiteError("The ring's host hid this site from that ring, so it stays as it is.")
    await db.ringStop.delete({ where: { id: existing.id } })
    return null
  }

  if (site.state !== 'verified') throw new SiteError('Prove the site is yours first, then it can join your rings.')
  if (existing?.externalSiteId === site.id) return existing
  if (existing?.status === 'hidden') {
    throw new SiteError("The ring's host hid your other site from that ring, so it can only be your pixel home there.")
  }

  const ring = await ringFacts(hub, ringSlug)
  if (!ring || ring.visibility !== 'PUBLIC') throw new SiteError('Strips are for public rings.')
  const mine = await memberships()
  if (!mine.some((r) => r.slug === ringSlug)) throw new SiteError("You're not in that ring.", 403)
  let status = firstStatus(await outsideSitesRule(db, ring))
  if (!status) throw new SiteError("That ring doesn't take outside sites. Your pixel home is your stop there.")
  // Nobody needs to ask themself
  if (status === 'pending' && (await isRingHost(db, hub, ringSlug, userId).catch(() => false))) status = 'listed'

  const stop = await db.$transaction(async (tx) => {
    if (existing) await tx.ringStop.delete({ where: { id: existing.id } })
    return tx.ringStop.create({ data: { ringSlug, externalSiteId: site.id, userId, status } })
  })
  if (status === 'pending') {
    for (const recipientId of await ringHosts(db, hub, ringSlug).catch(() => [])) {
      if (recipientId === userId) continue
      await notifyRingSite(db, { recipientId, actorId: userId, event: 'waiting', site, ringSlug, ringName: ring.name })
    }
  }
  return stop
}

export type StewardAction = 'approve' | 'hide' | 'unhide'

/** The host's say on one member's site in their ring. */
export async function stewardStop(
  db: PrismaClient,
  {
    stewardId,
    stopId,
    ringSlug,
    action,
    reason,
    hub,
    ring,
  }: { stewardId: string; stopId: string; ringSlug: string; action: StewardAction; reason?: string | null; hub: HubReader; ring: Pick<RingFacts, 'name'> }
): Promise<RingStop> {
  if (!(await isRingHost(db, hub, ringSlug, stewardId))) throw new SiteError("Only the ring's host can do that.", 403)
  const stop = await db.ringStop.findFirst({ where: { id: stopId, ringSlug }, include: { site: true } })
  if (!stop) throw new SiteError('That site isn\'t in this ring any more.', 404)

  const data =
    action === 'approve'
      ? stop.status === 'pending' ? { status: 'listed' as const } : null
      : action === 'hide'
        ? { status: 'hidden' as const, hiddenByUserId: stewardId, reason: reason?.trim().slice(0, 300) || null }
        : stop.status === 'hidden' ? { status: 'listed' as const, hiddenByUserId: null, reason: null } : null
  if (!data) return stop
  const updated = await db.ringStop.update({ where: { id: stop.id }, data })
  if (action !== 'unhide' && stop.userId !== stewardId) {
    await notifyRingSite(db, {
      recipientId: stop.userId,
      actorId: stewardId,
      event: action === 'approve' ? 'approved' : 'hidden',
      site: stop.site,
      ringSlug,
      ringName: ring.name,
    })
  }
  return updated
}

export async function setOutsideSitesRule(
  db: PrismaClient,
  { stewardId, ringSlug, rule, hub }: { stewardId: string; ringSlug: string; rule: RingOutsideSites; hub: HubReader }
) {
  if (!(await isRingHost(db, hub, ringSlug, stewardId))) throw new SiteError("Only the ring's host can do that.", 403)
  return db.ringSiteSettings.upsert({
    where: { ringSlug },
    create: { ringSlug, outsideSites: rule },
    update: { outsideSites: rule },
  })
}

/** Every outside site in a ring with its state, for Manage › Stops (pending and hidden too). */
export async function ringSiteRows(db: PrismaClient, ringSlug: string) {
  return db.ringStop.findMany({
    where: { ringSlug },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      reason: true,
      userId: true,
      createdAt: true,
      site: { select: { id: true, url: true, title: true, siteRef: true, state: true } },
    },
  })
}
