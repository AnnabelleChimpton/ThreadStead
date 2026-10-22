/**
 * Residents' sites elsewhere (Settings → Your sites), the ones that can be
 * their stop in a ThreadRing (design/rings-for-any-site/SCOPE.md §2).
 *
 * A site is added from a signed-in account and proved by one of:
 *   strip  a link back here carrying from=<the site's id> (any ring strip)
 *   meta   <meta name="homepageagain-verification" content="<id>">
 *   relme  rel="me" to the resident's profile here; counts only because the
 *          claim also came from their account, which makes it two-way
 *
 * Checking fetches the one page the owner gave us (the homepage, or the
 * page with their strip) through the Indie Index's SSRF-guarded fetcher.
 * robots.txt isn't read: the owner asked for this visit (owner decision
 * 2026-10-22). The Index's own robots handling is unchanged.
 *
 * Re-checked weekly. Two misses in a row and a site is resting: walks skip
 * to its owner's pixel home. Thirty days resting and it leaves its rings.
 * A page that ends up on another site (a parked domain) is a miss.
 */
import { randomBytes } from 'crypto'
import type { ExternalSite, ExternalSiteVerifyMethod, PrismaClient } from '@prisma/client'
import { isPlatformProfile, loadBlockedSet } from '@/lib/indie-index/blocklist'
import { attributesOf, extractHead, extractLinks, extractRelMe } from '@/lib/indie-index/html'
import { ACCEPT_HTML, FetchError, botUserAgent, createHttpFetcher, type Fetcher } from '@/lib/indie-index/http'
import { ApiError } from '@/lib/api/errors'
import { isBlockedHost, siteRefOf } from '@/lib/indie-index/site-key'
import { activeUserWhere } from '@/lib/domain/users/moderation'
import { countDoorway } from './counts'
import { notifyRingSite } from './notify'

export const MAX_SITES = 3
export const MISSES_BEFORE_RESTING = 2
export const RESTING_DAYS_BEFORE_REMOVED = 30
export const RECHECK_EVERY_DAYS = 7
const RECHECK_CONCURRENCY = 6
/** Only the start of a page matters for finding a strip or a tag. */
const PAGE_BYTES = 512 * 1024
export const VERIFY_META_NAME = 'homepageagain-verification'

const DAY = 24 * 60 * 60 * 1000

/** Public and opaque: 12 URL-safe characters. */
export function newSiteId(): string {
  return randomBytes(9).toString('base64url')
}

export class SiteError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'SiteError'
  }
}

/** Host without www. and port, for comparing against this site's own. */
function bareHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * The site a typed address belongs to, or a SiteError saying why it can't be
 * one. A missing scheme means https.
 */
export async function parseSiteUrl(
  db: Pick<PrismaClient, 'blockedSite'>,
  raw: string,
  baseUrl: string
): Promise<{ url: string; siteRef: string }> {
  const typed = raw.trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(typed) ? typed : `https://${typed}`
  const ref = siteRefOf(withScheme)
  if (!ref || isPlatformProfile(withScheme)) {
    throw new SiteError("That doesn't look like a website address I can visit.")
  }
  if (bareHost(withScheme) === bareHost(baseUrl)) {
    throw new SiteError("That's this site. Your pixel home is already your stop in your rings.")
  }
  if (isBlockedHost(ref.host, await loadBlockedSet(db))) {
    throw new SiteError("That's a big platform rather than a site of your own, so it can't be a ring stop.")
  }
  return { url: ref.url, siteRef: ref.key }
}

/** A page given for the strip has to be on the same site. */
function sameSitePage(raw: string, siteRef: string): string {
  const typed = raw.trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(typed) ? typed : `https://${typed}`
  if (siteRefOf(withScheme)?.key !== siteRef) {
    throw new SiteError('The page with your strip has to be on the same site.')
  }
  const url = new URL(withScheme)
  url.hash = ''
  return url.toString()
}

export async function addSite(
  db: PrismaClient,
  userId: string,
  { url: raw, stripPageUrl }: { url: string; stripPageUrl?: string | null },
  baseUrl: string
): Promise<ExternalSite> {
  const { url, siteRef } = await parseSiteUrl(db, raw, baseUrl)
  const page = stripPageUrl?.trim() ? sameSitePage(stripPageUrl, siteRef) : null
  const mine = await db.externalSite.findMany({ where: { userId }, select: { siteRef: true } })
  if (mine.some((s) => s.siteRef === siteRef)) throw new SiteError("You've added that site already.")
  if (mine.length >= MAX_SITES) throw new SiteError(`You can have ${MAX_SITES} sites here. Remove one to add another.`)
  return db.externalSite.create({ data: { id: newSiteId(), userId, url, siteRef, stripPageUrl: page } })
}

export async function updateStripPage(db: PrismaClient, site: ExternalSite, stripPageUrl: string | null) {
  const page = stripPageUrl?.trim() ? sameSitePage(stripPageUrl, site.siteRef) : null
  return db.externalSite.update({ where: { id: site.id }, data: { stripPageUrl: page } })
}

/**
 * How a page proves it belongs to the site with this id, or null.
 * `profileUrls` are the owner's profile addresses here, for rel="me".
 */
export function findProof(
  html: string,
  pageUrl: string,
  { siteId, baseUrl, profileUrls }: { siteId: string; baseUrl: string; profileUrls: string[] }
): ExternalSiteVerifyMethod | null {
  const ours = bareHost(baseUrl)
  const isOurs = (href: string) => bareHost(href) === ours

  for (const link of extractLinks(html, pageUrl)) {
    if (!isOurs(link.href)) continue
    if (new URL(link.href).searchParams.get('from') === siteId) return 'strip'
  }

  const head = html.replace(/<!--[\s\S]*?-->/g, ' ')
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag)
    if ((attrs.name ?? '').toLowerCase() === VERIFY_META_NAME && (attrs.content ?? '').trim() === siteId) return 'meta'
  }

  const profiles = new Set(profileUrls.map((u) => u.replace(/\/+$/, '').toLowerCase()))
  for (const href of extractRelMe(html, pageUrl)) {
    if (isOurs(href) && profiles.has(href.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase())) return 'relme'
  }
  return null
}

/** The owner's profile addresses here, for rel="me" (`/resident/<name>`, `/home/<name>`). */
export async function profileUrlsOf(db: Pick<PrismaClient, 'handle'>, userId: string, baseUrl: string): Promise<string[]> {
  const handles = await db.handle.findMany({ where: { userId }, select: { handle: true } })
  const origins = new Set<string>()
  const base = new URL(baseUrl)
  origins.add(base.origin)
  // Either spelling of the address counts
  const host = base.hostname
  origins.add(`${base.protocol}//${host.startsWith('www.') ? host.slice(4) : `www.${host}`}${base.port ? `:${base.port}` : ''}`)
  if (base.protocol === 'https:') origins.add(`http://${base.host}`)
  return [...origins].flatMap((o) =>
    handles.flatMap((h) => [`${o}/resident/${encodeURIComponent(h.handle)}`, `${o}/home/${encodeURIComponent(h.handle)}`])
  )
}

export type CheckOutcome =
  | { ok: true; method: ExternalSiteVerifyMethod; title: string | null }
  | { ok: false; reason: string }

/** Fetch the site's page and look for proof. Never throws. */
export async function lookForProof(
  site: Pick<ExternalSite, 'id' | 'url' | 'siteRef' | 'stripPageUrl'>,
  { fetcher, baseUrl, profileUrls }: { fetcher: Fetcher; baseUrl: string; profileUrls: string[] }
): Promise<CheckOutcome> {
  const page = site.stripPageUrl || site.url
  let res
  try {
    res = await fetcher({ url: page, accept: ACCEPT_HTML, maxBytes: PAGE_BYTES, truncate: true })
  } catch (error) {
    return { ok: false, reason: error instanceof FetchError ? `I couldn't reach it (${error.message}).` : "I couldn't reach it." }
  }
  if (res.status >= 400) return { ok: false, reason: `The page answered ${res.status}.` }
  if (siteRefOf(res.url)?.key !== site.siteRef) {
    return { ok: false, reason: `The page sent me on to ${bareHost(res.url) ?? 'another site'}, which isn't this site.` }
  }
  const method = findProof(res.body, res.url, { siteId: site.id, baseUrl, profileUrls })
  if (!method) {
    return {
      ok: false,
      reason: site.stripPageUrl ? "I didn't find your strip or tag on that page." : "I didn't find your strip or tag on your homepage.",
    }
  }
  return { ok: true, method, title: extractHead(res.body, res.url).title }
}

export type CheckResult = { site: ExternalSite; outcome: CheckOutcome }

/**
 * Check one site and record what happened: proved, still waiting, a miss,
 * resting, removed or back. Used by the owner's Check button and the
 * weekly re-check alike.
 */
export async function checkSite(
  db: PrismaClient,
  site: ExternalSite,
  { fetcher, baseUrl, now = new Date() }: { fetcher: Fetcher; baseUrl: string; now?: Date }
): Promise<CheckResult> {
  const outcome = await lookForProof(site, { fetcher, baseUrl, profileUrls: await profileUrlsOf(db, site.userId, baseUrl) })

  if (outcome.ok) {
    // Someone else proved this site first: theirs stands
    const taken = await db.externalSite.findFirst({
      where: { siteRef: site.siteRef, userId: { not: site.userId }, state: { in: ['verified', 'resting'] } },
      select: { id: true },
    })
    if (taken) {
      const reason = 'Someone else has already proved this site is theirs.'
      const updated = await db.externalSite.update({ where: { id: site.id }, data: { lastCheckedAt: now, lastError: reason } })
      return { site: updated, outcome: { ok: false, reason } }
    }
    const updated = await db.externalSite.update({
      where: { id: site.id },
      data: {
        state: 'verified',
        verifiedAt: site.state === 'verified' || site.state === 'resting' ? site.verifiedAt ?? now : now,
        verifyMethod: outcome.method,
        title: outcome.title ?? site.title,
        lastCheckedAt: now,
        lastOkAt: now,
        missCount: 0,
        restingSince: null,
        lastError: null,
      },
    })
    if (site.state === 'resting') {
      await notifyRingSite(db, { recipientId: site.userId, actorId: site.userId, event: 'back', site: updated })
    }
    return { site: updated, outcome }
  }

  // Not proved yet, or proof gone after it was removed: just say why
  if (site.state === 'pending' || site.state === 'removed') {
    const updated = await db.externalSite.update({ where: { id: site.id }, data: { lastCheckedAt: now, lastError: outcome.reason } })
    return { site: updated, outcome }
  }

  const missCount = site.missCount + 1
  const data: Partial<ExternalSite> = { lastCheckedAt: now, lastError: outcome.reason, missCount }
  let event: 'resting' | 'removed' | null = null
  if (site.state === 'verified' && missCount >= MISSES_BEFORE_RESTING) {
    Object.assign(data, { state: 'resting', restingSince: now })
    event = 'resting'
  } else if (site.state === 'resting' && site.restingSince && now.getTime() - site.restingSince.getTime() >= RESTING_DAYS_BEFORE_REMOVED * DAY) {
    Object.assign(data, { state: 'removed' })
    event = 'removed'
  }
  const updated = await db.$transaction(async (tx) => {
    // Leaving its rings keeps a ring owner's "hidden" (it's theirs to lift)
    if (event === 'removed') await tx.ringStop.deleteMany({ where: { externalSiteId: site.id, status: { not: 'hidden' } } })
    return tx.externalSite.update({ where: { id: site.id }, data })
  })
  if (event) await notifyRingSite(db, { recipientId: site.userId, actorId: site.userId, event, site: updated })
  return { site: updated, outcome }
}

/** Sites due their weekly re-check (proved ones, resting ones included). */
export async function sitesDueRecheck(db: PrismaClient, now: Date, limit = 500): Promise<ExternalSite[]> {
  return db.externalSite.findMany({
    where: {
      state: { in: ['verified', 'resting'] },
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lte: new Date(now.getTime() - RECHECK_EVERY_DAYS * DAY + 4 * 60 * 60 * 1000) } }],
    },
    orderBy: { lastCheckedAt: { sort: 'asc', nulls: 'first' } },
    take: limit,
  })
}

/** Weekly: check every due site. A host gets one request at a time (the polite fetcher). */
export async function recheckSites(
  db: PrismaClient,
  { fetcher, baseUrl, now = () => new Date(), log = () => {} }: { fetcher: Fetcher; baseUrl: string; now?: () => Date; log?: (line: string) => void }
) {
  const due = await sitesDueRecheck(db, now())
  const stats = { checked: 0, ok: 0, missed: 0, resting: 0, removed: 0 }
  let next = 0
  const worker = async () => {
    while (next < due.length) {
      const site = due[next++]
      try {
        const { site: after, outcome } = await checkSite(db, site, { fetcher, baseUrl, now: now() })
        stats.checked++
        if (outcome.ok) stats.ok++
        else stats.missed++
        if (after.state === 'resting' && site.state !== 'resting') stats.resting++
        if (after.state === 'removed') stats.removed++
      } catch (error) {
        log(`Ring site ${site.id} check failed: ${error instanceof Error ? error.message : error}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(RECHECK_CONCURRENCY, due.length) }, worker))
  return stats
}

let fetcher: Fetcher | null = null

/** The fetcher for owner-requested checks: SSRF-guarded, capped, our bot's name. */
export function siteCheckFetcher(baseUrl: string): Fetcher {
  fetcher ??= createHttpFetcher({ userAgent: botUserAgent(baseUrl), timeoutMs: 10_000 })
  return fetcher
}

/** Turns a SiteError into the API's { error } with its status. */
export function asApiError(error: unknown): unknown {
  return error instanceof SiteError ? new ApiError(error.status, error.message) : error
}

/**
 * The proved site a visitor came from through its strip's badge (the ring
 * page's ?from=<id>), counted as an arrival; null for anything else.
 */
export async function cameFromSite(db: PrismaClient, ringSlug: string, from: unknown): Promise<{ id: string; url: string; name: string } | null> {
  if (typeof from !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(from)) return null
  const site = await db.externalSite.findFirst({
    where: { id: from, state: { in: ['verified', 'resting'] }, user: activeUserWhere() },
    select: { id: true, url: true, title: true },
  })
  if (!site) return null
  await countDoorway(db, ringSlug, site.id, 'ring')
  return { id: site.id, url: site.url, name: site.title || siteRefOf(site.url)?.key || site.url }
}
