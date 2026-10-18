/**
 * Nightly signal harvest for the Indie Index (SEARCH_PLAN.md §3.5): reads
 * where residents point at sites and turns it into SiteSignal rows, then
 * recomputes every site's tier. Database only, no fetching.
 *
 *   own          a Websites entry ticked "This is my site"
 *   blogroll     any other Websites entry (Profile.blogroll)
 *   home_link    a link in a live profile template or the bio
 *   home_button  an 88×31 button in a live profile template
 *   page_link    a link on a published CustomPage (the admin's signal)
 *
 * Only public profiles are read. Signals whose source has gone are deleted,
 * so a resident who removes a link, or makes their profile private, takes
 * their signal back on the next run. `backlink` signals belong to the
 * refresher (it finds them on the sites' homepages) and are left alone.
 *
 * Also: points SiteLink rows at Sites, creates candidates for sites that
 * listed sites link to, counts links, sets owners and buttons, and removes
 * candidates nobody points at any more, and sites on hosts that were blocked since.
 */
import { randomUUID } from 'crypto'
import type { PrismaClient, SiteSignalKind } from '@prisma/client'
import { extractBareUrls, extractLinks } from './html'
import { isPlatformProfile, loadBlockedSet } from './blocklist'
import { isBlockedHost, isOptedOut, siteRefOf, type SiteRef } from './site-key'
import { utc } from './sql'
import { recomputeSites } from './tiers'

/** New sites found only through links from listed sites, per run. */
export const MAX_LINK_CANDIDATES_PER_RUN = 200

type HarvestKind = Exclude<SiteSignalKind, 'backlink'>

interface Found {
  ref: SiteRef
  signals: Map<string, { userId: string; kind: HarvestKind }>
  button?: string
}

export interface HarvestResult {
  signals: number
  sitesCreated: number
  linkCandidatesCreated: number
  signalsRemoved: number
  candidatesRemoved: number
  /** Sites on hosts added to the BlockedSite list since they came in. */
  blockedRemoved: number
}

export interface HarvestOptions {
  /** This site's own URL: links back to it aren't other sites. */
  baseUrl: string
  now?: Date
}

/** Websites entries as stored in Profile.blogroll ({ url, mine? }). */
function blogrollEntries(blogroll: unknown): Array<{ url: string; mine: boolean }> {
  if (!Array.isArray(blogroll)) return []
  return blogroll.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { url, mine } = item as { url?: unknown; mine?: unknown }
    return typeof url === 'string' ? [{ url, mine: mine === true }] : []
  })
}

export async function harvestSignals(db: PrismaClient, { baseUrl, now = new Date() }: HarvestOptions): Promise<HarvestResult> {
  const ownHost = siteRefOf(baseUrl)?.host
  const [blockedSet, optOuts] = await Promise.all([loadBlockedSet(db), db.siteOptOut.findMany({ select: { key: true } })])
  const optOutSet = new Set(optOuts.map((o) => o.key))

  const found = new Map<string, Found>()
  const add = (rawUrl: string, userId: string, kind: HarvestKind, button?: string) => {
    const ref = siteRefOf(rawUrl)
    if (!ref || isPlatformProfile(rawUrl) || ref.host === ownHost || isBlockedHost(ref.host, blockedSet) || isOptedOut(ref, optOutSet)) return
    let entry = found.get(ref.key)
    if (!entry) {
      entry = { ref, signals: new Map() }
      found.set(ref.key, entry)
    }
    entry.signals.set(`${userId}:${kind}`, { userId, kind })
    if (button && !entry.button) entry.button = button
  }

  // Residents' homes: Websites list, bio, and the profile template when it's live.
  const profiles = await db.profile.findMany({
    where: { visibility: 'public' },
    select: { userId: true, blogroll: true, bio: true, customTemplate: true, templateMode: true, templateEnabled: true },
  })
  const profileBase = `${baseUrl.replace(/\/+$/, '')}/`
  for (const p of profiles) {
    for (const entry of blogrollEntries(p.blogroll)) add(entry.url, p.userId, entry.mine ? 'own' : 'blogroll')
    if (p.bio) {
      for (const link of extractLinks(p.bio, profileBase)) add(link.href, p.userId, 'home_link')
      for (const url of extractBareUrls(p.bio)) add(url, p.userId, 'home_link')
    }
    if (p.templateMode === 'advanced' && p.templateEnabled && p.customTemplate) {
      for (const link of extractLinks(p.customTemplate, profileBase)) {
        add(link.href, p.userId, link.button ? 'home_button' : 'home_link', link.button?.src)
      }
    }
  }

  // The site's own pages count as the admin's signal.
  const admin = await db.user.findFirst({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (admin) {
    const pages = await db.customPage.findMany({ where: { published: true }, select: { content: true } })
    for (const page of pages) {
      for (const link of extractLinks(page.content, profileBase)) add(link.href, admin.id, 'page_link', link.button?.src)
    }
  }

  // Make sure every site pointed at has a row (new ones start as candidates).
  const keys = [...found.keys()]
  const before = await db.site.count()
  if (keys.length > 0) {
    await db.site.createMany({
      data: [...found.values()].map(({ ref }) => ({ key: ref.key, host: ref.host, url: ref.url, source: 'community' as const })),
      skipDuplicates: true,
    })
  }
  const sitesCreated = (await db.site.count()) - before
  const siteIds = new Map(
    (await db.site.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } })).map((s) => [s.key, s.id])
  )

  // Upsert every signal seen, then drop the ones not seen this run.
  const rows: Array<{ siteId: string; userId: string; kind: HarvestKind }> = []
  for (const [key, entry] of found) {
    const siteId = siteIds.get(key)
    if (!siteId) continue
    for (const s of entry.signals.values()) rows.push({ siteId, ...s })
  }
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000)
    await db.$executeRaw`
      INSERT INTO "SiteSignal" ("id", "siteId", "userId", "kind", "firstSeenAt", "lastSeenAt")
      SELECT t.id, t.site_id, t.user_id, t.kind::"SiteSignalKind", ${utc(now)}, ${utc(now)}
      FROM unnest(${chunk.map(() => randomUUID())}::text[], ${chunk.map((r) => r.siteId)}::text[],
                  ${chunk.map((r) => r.userId)}::text[], ${chunk.map((r) => r.kind)}::text[]) AS t(id, site_id, user_id, kind)
      JOIN "User" u ON u."id" = t.user_id
      ON CONFLICT ("siteId", "userId", "kind") DO UPDATE SET "lastSeenAt" = EXCLUDED."lastSeenAt"
    `
  }
  const { count: signalsRemoved } = await db.siteSignal.deleteMany({
    where: { kind: { not: 'backlink' }, lastSeenAt: { lt: now } },
  })

  // Buttons seen this run.
  for (const [key, entry] of found) {
    if (!entry.button) continue
    // (`NOT: { buttonUrl }` alone would skip rows where it's NULL.)
    await db.site.updateMany({
      where: { key, OR: [{ buttonUrl: null }, { buttonUrl: { not: entry.button } }] },
      data: { buttonUrl: entry.button },
    })
  }

  // Owner: whoever claimed it first (a tick or a backlink).
  await db.$executeRaw`
    UPDATE "Site" s SET "ownerId" = o."userId"
    FROM (
      SELECT DISTINCT ON (si."id") si."id", sig."userId"
      FROM "Site" si
      LEFT JOIN "SiteSignal" sig ON sig."siteId" = si."id" AND sig."kind" IN ('own', 'backlink')
      ORDER BY si."id", sig."firstSeenAt" ASC NULLS LAST, sig."userId"
    ) o
    WHERE s."id" = o."id" AND s."ownerId" IS DISTINCT FROM o."userId"
  `

  // Site-to-site links: hook up targets that now have rows.
  await db.$executeRaw`
    UPDATE "SiteLink" l SET "toSiteId" = s."id" FROM "Site" s WHERE s."key" = l."toKey" AND l."toSiteId" IS NULL
  `
  const linkCandidatesCreated = await createLinkCandidates(db, blockedSet, optOutSet, ownHost)

  await recomputeSites(db, undefined, now)

  await db.$executeRaw`
    UPDATE "Site" s SET "linkedFromSites" = COALESCE(c.n, 0)
    FROM "Site" t
    LEFT JOIN (
      SELECT l."toSiteId", count(DISTINCT l."fromSiteId")::int AS n
      FROM "SiteLink" l JOIN "Site" f ON f."id" = l."fromSiteId"
      WHERE f."tier" IN ('resident', 'vouched', 'community') AND f."status" IN ('active', 'stale')
      GROUP BY l."toSiteId"
    ) c ON c."toSiteId" = t."id"
    WHERE s."id" = t."id" AND s."linkedFromSites" IS DISTINCT FROM COALESCE(c.n, 0)
  `

  // Sites on a host that was added to the big-platforms list since.
  const hosts = await db.site.findMany({ distinct: ['host'], select: { host: true } })
  const blockedHosts = hosts.map((h) => h.host).filter((host) => isBlockedHost(host, blockedSet))
  const { count: blockedRemoved } = blockedHosts.length
    ? await db.site.deleteMany({ where: { host: { in: blockedHosts } } })
    : { count: 0 }

  // Candidates that nothing points at any more.
  const { count: candidatesRemoved } = await db.site.deleteMany({
    where: {
      tier: 'candidate',
      source: 'community',
      grandfathered: false,
      ownerId: null,
      signals: { none: {} },
      vouches: { none: {} },
      linksIn: { none: { fromSite: { tier: { in: ['resident', 'vouched', 'community'] } } } },
    },
  })

  return { signals: rows.length, sitesCreated, linkCandidatesCreated, signalsRemoved, candidatesRemoved, blockedRemoved }
}

/**
 * Sites that listed community sites link to, but that aren't in the index
 * yet, become candidates (most-linked first, capped per run). The refresher
 * checks their homepage once; residents decide whether they're listed.
 */
async function createLinkCandidates(
  db: PrismaClient,
  blockedSet: Set<string>,
  optOutSet: Set<string>,
  ownHost: string | undefined
): Promise<number> {
  const targets = await db.$queryRaw<Array<{ toKey: string }>>`
    SELECT l."toKey"
    FROM "SiteLink" l JOIN "Site" f ON f."id" = l."fromSiteId"
    WHERE l."toSiteId" IS NULL
      AND f."tier" IN ('resident', 'vouched', 'community') AND f."status" IN ('active', 'stale')
    GROUP BY l."toKey"
    ORDER BY count(DISTINCT l."fromSiteId") DESC, l."toKey"
    LIMIT ${MAX_LINK_CANDIDATES_PER_RUN * 2}
  `
  const data: Array<{ key: string; host: string; url: string; source: 'community' }> = []
  for (const { toKey } of targets) {
    const ref = siteRefOf(`https://${toKey}/`)
    if (!ref || ref.key !== toKey || ref.host === ownHost || isBlockedHost(ref.host, blockedSet) || isOptedOut(ref, optOutSet)) continue
    data.push({ key: ref.key, host: ref.host, url: ref.url, source: 'community' })
    if (data.length >= MAX_LINK_CANDIDATES_PER_RUN) break
  }
  if (data.length === 0) return 0
  const { count } = await db.site.createMany({ data, skipDuplicates: true })
  await db.$executeRaw`
    UPDATE "SiteLink" l SET "toSiteId" = s."id" FROM "Site" s WHERE s."key" = l."toKey" AND l."toSiteId" IS NULL
  `
  return count
}
