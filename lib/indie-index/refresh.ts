/**
 * The Indie Index feed refresher (SEARCH_PLAN.md §3.5). Picks the sites that
 * are due, then for each one: robots.txt, the homepage once a week
 * (community sites and new candidates), and the feed (community and pool
 * sites). Feed entries become SiteItems.
 *
 * Every request goes through the Fetcher it's given. The nightly runner
 * passes a polite one (one request per host at a time, 2 s apart); tests
 * pass fixtures.
 */
import type { Prisma, PrismaClient, Site } from '@prisma/client'
import { SITE_NAME } from '@/lib/config/site/constants'
import { excerptOf, parseFeed, siteNameFromFeedTitle, type FeedItem } from './feed'
import { extractHead, extractLinks, extractRelMe, headerSaysNoindex } from './html'
import { ACCEPT_FEED, ACCEPT_HTML, ACCEPT_TEXT, FetchError, type Fetcher } from './http'
import { ALLOW_ALL, parseRobots, robotsPath, type Robots } from './robots'
import { isPlatformProfile, loadBlockedSet } from './blocklist'
import { LIMITS } from './public'
import { isBlockedHost, isOptedOut, siteRefOf } from './site-key'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export { LIMITS }

export interface RefreshOptions {
  fetcher: Fetcher
  /** This site's URL: links to `/resident/<name>` on it are backlinks. */
  baseUrl: string
  now?: () => Date
  /** Don't start another site after this. */
  deadline?: Date
  /** Hosts worked on at once. */
  concurrency?: number
  poolPerRun?: number
  candidatesPerRun?: number
  /** Refresh just these keys, due or not (scripts/indie-index-refresh.ts --site). */
  onlyKeys?: string[]
  random?: () => number
  log?: (line: string) => void
}

export interface RefreshStats {
  sites: number
  fetched: number
  notModified: number
  failed: number
  itemsAdded: number
  optedOut: number
  dropped: number
}

type DueSite = Pick<
  Site,
  | 'id' | 'key' | 'host' | 'url' | 'title' | 'description' | 'feedUrl' | 'feedEtag' | 'feedLastModified' | 'source' | 'tier'
  | 'status' | 'homepageCheckedAt' | 'lastOkAt' | 'failCount' | 'createdAt'
>

const SELECT = {
  id: true, key: true, host: true, url: true, title: true, description: true, feedUrl: true, feedEtag: true,
  feedLastModified: true, source: true, tier: true, status: true, homepageCheckedAt: true, lastOkAt: true,
  failCount: true, createdAt: true,
} satisfies Prisma.SiteSelect

const LISTED_COMMUNITY = ['resident', 'vouched', 'community'] as const

class OptOut extends Error {
  constructor(readonly via: 'robots' | 'meta', readonly hostWide: boolean) {
    super(`opted out (${via})`)
  }
}

export async function refreshSites(db: PrismaClient, options: RefreshOptions): Promise<RefreshStats> {
  const now = options.now ?? (() => new Date())
  const random = options.random ?? Math.random
  const log = options.log ?? (() => {})
  const stats: RefreshStats = { sites: 0, fetched: 0, notModified: 0, failed: 0, itemsAdded: 0, optedOut: 0, dropped: 0 }
  const start = now()

  const sites: DueSite[] = options.onlyKeys
    ? await db.site.findMany({ where: { key: { in: options.onlyKeys } }, select: SELECT })
    : [
        ...(await db.site.findMany({
          where: { source: 'community', tier: { in: [...LISTED_COMMUNITY] }, status: { not: 'hidden' }, nextFetchAt: { lte: start } },
          select: SELECT,
        })),
        ...(await db.site.findMany({
          where: { tier: 'candidate', status: { not: 'hidden' }, homepageCheckedAt: null },
          orderBy: { createdAt: 'asc' },
          take: options.candidatesPerRun ?? 200,
          select: SELECT,
        })),
        ...(await db.site.findMany({
          where: { source: 'pool', tier: 'pool', status: { not: 'hidden' }, nextFetchAt: { lte: start } },
          orderBy: { nextFetchAt: 'asc' },
          take: options.poolPerRun ?? 1500,
          select: SELECT,
        })),
      ]

  // One robots.txt per origin per run.
  const robotsCache = new Map<string, Promise<Robots | null>>()
  const robotsFor = (url: string): Promise<Robots | null> => {
    const origin = new URL(url).origin
    let cached = robotsCache.get(origin)
    if (!cached) {
      cached = options
        .fetcher({ url: `${origin}/robots.txt`, accept: ACCEPT_TEXT, maxBytes: LIMITS.robotsBytes, truncate: true })
        .then((res) => {
          if (res.status >= 200 && res.status < 300) return parseRobots(res.body)
          if (res.status >= 400 && res.status < 500) return ALLOW_ALL
          return null
        })
        .catch(() => null)
      robotsCache.set(origin, cached)
    }
    return cached
  }

  const ownHost = siteRefOf(options.baseUrl)?.host
  const [blockedSet, optOuts] = await Promise.all([loadBlockedSet(db), db.siteOptOut.findMany({ select: { key: true } })])
  const optOutSet = new Set(optOuts.map((o) => o.key))

  // ------------------------------------------------------- one site ----
  const refreshOne = async (site: DueSite): Promise<void> => {
    const t = now()
    const kind = site.tier === 'candidate' ? 'candidate' : site.source === 'pool' ? 'pool' : 'community'
    const data: Prisma.SiteUpdateInput = { lastFetchedAt: t }
    let feedUrl = site.feedUrl

    try {
      const homeRobots = await robotsFor(site.url)
      if (!homeRobots) throw new FetchError('robots.txt unreachable')
      if (!homeRobots.allows(robotsPath(site.url))) throw new OptOut('robots', !homeRobots.allows('/'))

      const homepageDue = kind !== 'pool' && (!site.homepageCheckedAt || t.getTime() - site.homepageCheckedAt.getTime() >= LIMITS.homepageEvery)
      if (homepageDue) {
        try {
          const home = await options.fetcher({ url: site.url, accept: ACCEPT_HTML, maxBytes: LIMITS.homepageBytes, truncate: true })
          stats.fetched++
          if (home.status >= 400) throw new FetchError(`homepage returned ${home.status}`)
          if (headerSaysNoindex(home.headers.get('x-robots-tag'))) throw new OptOut('meta', false)
          const head = extractHead(home.body, home.url)
          if (head.noindex) throw new OptOut('meta', false)
          // A front page's <title> is often its newest post ("Home - …" at
          // best); the feed's own title names the site better, so the page
          // title only fills a gap.
          if (head.title && !site.title) data.title = head.title
          if (head.description) data.description = head.description
          if (!feedUrl && head.feeds[0]) feedUrl = head.feeds[0]
          if (kind === 'community') await recordHomepageLinks(site, home.body, home.url, t)
        } catch (error) {
          // A broken homepage doesn't matter while the feed works.
          if (error instanceof OptOut || kind === 'candidate' || !feedUrl) throw error
          log(`${site.key}: ${error instanceof Error ? error.message : String(error)} (reading the feed anyway)`)
        }
        data.homepageCheckedAt = t
      }

      if (kind !== 'candidate' && feedUrl) {
        const feedRobots = new URL(feedUrl).origin === new URL(site.url).origin ? homeRobots : await robotsFor(feedUrl)
        if (feedRobots?.allows(robotsPath(feedUrl))) {
          const sameFeed = feedUrl === site.feedUrl
          let res = await options.fetcher({
            url: feedUrl,
            accept: ACCEPT_FEED,
            maxBytes: LIMITS.feedBytes,
            etag: sameFeed ? site.feedEtag : null,
            lastModified: sameFeed ? site.feedLastModified : null,
          })
          stats.fetched++
          if (res.status === 304) {
            stats.notModified++
          } else {
            if (res.status >= 400) throw new FetchError(`feed returned ${res.status}`)
            let parsed = parseFeed(res.body, res.url)
            if (!parsed) {
              // The "feed" is a page: look for its real feed once.
              const alternate = extractHead(res.body, res.url).feeds.find((f) => f !== feedUrl)
              if (alternate) {
                feedUrl = alternate
                res = await options.fetcher({ url: feedUrl, accept: ACCEPT_FEED, maxBytes: LIMITS.feedBytes })
                stats.fetched++
                if (res.status >= 400) throw new FetchError(`feed returned ${res.status}`)
                parsed = parseFeed(res.body, res.url)
              }
            }
            if (!parsed) throw new FetchError('not a feed')
            const feedName = siteNameFromFeedTitle(parsed.title, site.host)
            if (feedName) data.title = feedName.slice(0, 300)
            if (!data.description && !site.description && parsed.description) data.description = parsed.description.slice(0, 1000)
            data.feedEtag = res.headers.get('etag')
            data.feedLastModified = res.headers.get('last-modified')
            const limits = kind === 'pool' ? LIMITS.pool : LIMITS.community
            stats.itemsAdded += await storeItems(db, site.id, parsed.items, limits, t)
          }
          data.feedUrl = feedUrl
        }
      } else if (feedUrl !== site.feedUrl) {
        data.feedUrl = feedUrl
      }

      // Freshness from what's stored.
      const [latest, recent] = await Promise.all([
        db.siteItem.aggregate({ where: { siteId: site.id }, _max: { publishedAt: true } }),
        db.siteItem.count({ where: { siteId: site.id, publishedAt: { gte: new Date(t.getTime() - 90 * DAY) } } }),
      ])
      const lastPostAt = latest._max.publishedAt
      if (kind === 'pool' && lastPostAt && t.getTime() - lastPostAt.getTime() > LIMITS.poolSilence) {
        await db.site.delete({ where: { id: site.id } })
        stats.dropped++
        log(`${site.key}: dropped from the pool (nothing new in a year)`)
        return
      }

      Object.assign(data, {
        lastPostAt,
        postsLast90d: recent,
        failCount: 0,
        lastError: null,
        lastOkAt: t,
        nextFetchAt: nextAfterSuccess(kind, !!feedUrl, t, random),
      })
      if (site.status !== 'hidden') data.status = 'active'
      await db.site.update({ where: { id: site.id }, data })
    } catch (error) {
      if (error instanceof OptOut) {
        const key = error.hostWide ? site.host : site.key
        await db.$transaction([
          db.siteOptOut.upsert({ where: { key }, create: { key, via: error.via }, update: {} }),
          db.site.deleteMany({ where: error.hostWide ? { host: site.host } : { key: site.key } }),
        ])
        optOutSet.add(key)
        stats.optedOut++
        log(`${site.key}: ${error.message}${error.hostWide ? ' for the whole host' : ''}`)
        return
      }
      stats.failed++
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 300)
      log(`${site.key}: ${message}`)
      await recordFailure(site, kind, message, t, data)
    }
  }

  // ------------------------------------------ links on a homepage ----
  const recordHomepageLinks = async (site: DueSite, html: string, pageUrl: string, t: Date) => {
    // Backlinks: the site links to a resident's profile here.
    const handles = new Set<string>()
    for (const href of [...extractLinks(html, pageUrl).map((l) => l.href), ...extractRelMe(html, pageUrl)]) {
      const u = new URL(href)
      const m = u.pathname.match(/^\/resident\/([^/]+)\/?$/)
      if (m && siteRefOf(href)?.host === ownHost) handles.add(decodeURIComponent(m[1]).toLowerCase())
    }
    const owners = handles.size
      ? await db.handle.findMany({ where: { handle: { in: [...handles] }, host: SITE_NAME }, select: { userId: true } })
      : []
    for (const { userId } of owners) {
      await db.siteSignal.upsert({
        where: { siteId_userId_kind: { siteId: site.id, userId, kind: 'backlink' } },
        create: { siteId: site.id, userId, kind: 'backlink', firstSeenAt: t, lastSeenAt: t },
        update: { lastSeenAt: t },
      })
    }
    await db.siteSignal.deleteMany({ where: { siteId: site.id, kind: 'backlink', lastSeenAt: { lt: t } } })

    // Outbound links to other sites, for discovery and ranking.
    const targets = new Set<string>()
    for (const link of extractLinks(html, pageUrl)) {
      const ref = siteRefOf(link.href)
      if (!ref || isPlatformProfile(link.href) || ref.key === site.key || ref.host === ownHost || isBlockedHost(ref.host, blockedSet) || isOptedOut(ref, optOutSet)) continue
      targets.add(ref.key)
      if (targets.size >= LIMITS.linksPerSite) break
    }
    for (const toKey of targets) {
      await db.siteLink.upsert({
        where: { fromSiteId_toKey: { fromSiteId: site.id, toKey } },
        create: { fromSiteId: site.id, toKey, firstSeenAt: t, lastSeenAt: t },
        update: { lastSeenAt: t },
      })
    }
    await db.siteLink.deleteMany({ where: { fromSiteId: site.id, lastSeenAt: { lt: t } } })
  }

  // --------------------------------------------------------- failure ----
  const recordFailure = async (site: DueSite, kind: string, message: string, t: Date, data: Prisma.SiteUpdateInput) => {
    const failCount = site.failCount + 1
    if (kind === 'pool') {
      if (failCount >= LIMITS.poolMaxFailures) {
        await db.site.delete({ where: { id: site.id } })
        stats.dropped++
        return
      }
      await db.site.update({
        where: { id: site.id },
        data: { lastFetchedAt: t, failCount, lastError: message, nextFetchAt: new Date(t.getTime() + LIMITS.poolEvery * (0.9 + random() * 0.2)) },
      })
      return
    }
    const sinceOk = t.getTime() - (site.lastOkAt ?? site.createdAt).getTime()
    const dead = failCount >= 5 && sinceOk >= 14 * DAY
    let status = site.status
    if (status !== 'hidden') status = dead ? 'dead' : sinceOk >= 7 * DAY ? 'stale' : status
    const backoffDays = dead ? 7 : Math.min(2 ** (failCount - 1), 7)
    await db.site.update({
      where: { id: site.id },
      data: {
        lastFetchedAt: t,
        failCount,
        lastError: message,
        status,
        nextFetchAt: new Date(t.getTime() + backoffDays * DAY - 4 * HOUR),
        // A candidate is only checked once; don't retry it every night.
        ...(kind === 'candidate' ? { homepageCheckedAt: t } : {}),
        ...(data.feedUrl !== undefined ? { feedUrl: data.feedUrl } : {}),
      },
    })
  }

  // ---------------------------------------------------- run by host ----
  const byHost = new Map<string, DueSite[]>()
  for (const site of sites) {
    const list = byHost.get(site.host) ?? []
    if (!list.some((s) => s.id === site.id)) list.push(site)
    byHost.set(site.host, list)
  }
  const queue = [...byHost.values()]
  const worker = async () => {
    for (;;) {
      const group = queue.shift()
      if (!group) return
      for (const site of group) {
        if (options.deadline && now() >= options.deadline) return
        if (isOptedOut(site, optOutSet)) continue
        stats.sites++
        try {
          await refreshOne(site)
        } catch (error) {
          // A database error on one site shouldn't stop the run.
          stats.failed++
          log(`${site.key}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency ?? 8) }, worker))
  return stats
}

/**
 * Community sites with a feed: tomorrow night (20 h, so the next nightly run
 * picks them up). Without a feed there's only the weekly homepage check.
 * Pool sites: about a month, spread out so the rotation stays even.
 */
function nextAfterSuccess(kind: string, hasFeed: boolean, t: Date, random: () => number): Date {
  if (kind === 'pool') return new Date(t.getTime() + LIMITS.poolEvery * (0.9 + random() * 0.2))
  if (kind === 'candidate') return new Date(t.getTime() + 20 * HOUR)
  return new Date(t.getTime() + (hasFeed ? 20 * HOUR : LIMITS.homepageEvery - 4 * HOUR))
}

/**
 * Save the newest `limits.items` entries (insert new, update changed), then
 * drop older ones. Returns how many were new.
 */
export async function storeItems(
  db: PrismaClient,
  siteId: string,
  items: FeedItem[],
  limits: { items: number; excerpt: number },
  t: Date
): Promise<number> {
  const latestAllowed = t.getTime() + DAY
  const seen = new Set<string>()
  const clean = items
    .filter((item) => (seen.has(item.url) ? false : (seen.add(item.url), true)))
    .map((item) => ({
      url: item.url.slice(0, 2000),
      title: item.title?.slice(0, 300) ?? null,
      excerpt: excerptOf(item.text, limits.excerpt),
      // A date in the future is a typo or a scheduling trick: treat it as unknown.
      publishedAt: item.publishedAt && item.publishedAt.getTime() <= latestAllowed ? item.publishedAt : null,
    }))
    .sort((a, b) => (b.publishedAt?.getTime() ?? -Infinity) - (a.publishedAt?.getTime() ?? -Infinity))
    .slice(0, limits.items)

  const existing = new Map(
    (await db.siteItem.findMany({
      where: { siteId, url: { in: clean.map((i) => i.url) } },
      select: { id: true, url: true, title: true, excerpt: true, publishedAt: true },
    })).map((row) => [row.url, row])
  )
  const fresh = clean.filter((i) => !existing.has(i.url))
  if (fresh.length) await db.siteItem.createMany({ data: fresh.map((i) => ({ siteId, fetchedAt: t, ...i })), skipDuplicates: true })
  for (const item of clean) {
    const row = existing.get(item.url)
    if (row && (row.title !== item.title || row.excerpt !== item.excerpt || row.publishedAt?.getTime() !== item.publishedAt?.getTime())) {
      await db.siteItem.update({ where: { id: row.id }, data: { title: item.title, excerpt: item.excerpt, publishedAt: item.publishedAt } })
    }
  }

  await db.$executeRaw`
    DELETE FROM "SiteItem" WHERE "siteId" = ${siteId} AND "id" NOT IN (
      SELECT "id" FROM "SiteItem" WHERE "siteId" = ${siteId}
      ORDER BY "publishedAt" DESC NULLS LAST, "fetchedAt" DESC, "id" LIMIT ${limits.items}
    )
  `
  return fresh.length
}
