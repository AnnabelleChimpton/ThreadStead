/**
 * Indie Index stage 3 against a real Postgres (SEARCH_PLAN.md §3.5): signal
 * harvesting, the feed refresher, the Kagi Small Web import and the nightly
 * runner. Every HTTP request goes to a fixture Fetcher; nothing touches the
 * network.
 */
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { harvestSignals, MAX_LINK_CANDIDATES_PER_RUN } from '@/lib/indie-index/harvest'
import type { FetchRequest, Fetcher } from '@/lib/indie-index/http'
import { importKagiList, KAGI_SMALLWEB_URL } from '@/lib/indie-index/kagi'
import { RunInProgressError, runNightly } from '@/lib/indie-index/nightly'
import { refreshSites, LIMITS } from '@/lib/indie-index/refresh'

const BASE = 'https://homepageagain.example.org'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOW = new Date('2026-10-19T03:15:00Z')

// ------------------------------------------------------------- fixtures --

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE "User", "Site", "SiteOptOut", "IndexRun", "BlockedSite", "CustomPage" RESTART IDENTITY CASCADE'
  )
}

let seq = 0
async function resident(
  name: string,
  profile: Partial<{ blogroll: unknown; bio: string; customTemplate: string; templateMode: 'default' | 'advanced'; visibility: 'public' | 'private' }> = {},
  opts: { ageDays?: number; role?: 'member' | 'admin' } = {}
) {
  const id = `u_${name}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${name}:${seq++}`,
      role: opts.role ?? 'member',
      createdAt: new Date(NOW.getTime() - (opts.ageDays ?? 30) * DAY),
      handles: { create: { handle: name, host: SITE_NAME } },
      profile: { create: { displayName: name, ...profile } as never },
    },
  })
  return id
}

type Route = { status?: number; body?: string; headers?: Record<string, string>; url?: string } | Error | ((req: FetchRequest) => Route)

/** A Fetcher that answers from a table; anything not listed is a 404. */
function fixtures(routes: Record<string, Route>) {
  const calls: FetchRequest[] = []
  const fetcher: Fetcher = async (req) => {
    calls.push(req)
    let route = routes[req.url]
    while (typeof route === 'function') route = route(req)
    if (route instanceof Error) throw route
    if (!route) return { status: 404, url: req.url, headers: new Headers(), body: '' }
    return { status: route.status ?? 200, url: route.url ?? req.url, headers: new Headers(route.headers ?? {}), body: route.body ?? '' }
  }
  return { fetcher, calls, urls: () => calls.map((c) => c.url) }
}

function rss(items: Array<{ url: string; title?: string; date?: Date | null; body?: string }>, title = 'A feed') {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>${title}</title><link>https://x.example.org/</link>
    ${items
      .map(
        (i) => `<item><title>${i.title ?? 'Post'}</title><link>${i.url}</link>${i.date ? `<pubDate>${i.date.toUTCString()}</pubDate>` : ''}
          <description><![CDATA[${i.body ?? '<p>Body text</p>'}]]></description></item>`
      )
      .join('')}</channel></rss>`
}

function homepage({ title = 'Home', description = '', feed = '', body = '', head = '' } = {}) {
  return `<!doctype html><html><head><title>${title}</title>
    ${description ? `<meta name="description" content="${description}">` : ''}
    ${feed ? `<link rel="alternate" type="application/rss+xml" href="${feed}">` : ''}${head}
    </head><body>${body}</body></html>`
}

async function listedSite(key: string, data: Record<string, unknown> = {}) {
  return db.site.create({
    data: { key, host: key.split('/')[0], url: `https://${key}/`, source: 'community', tier: 'community', grandfathered: true, nextFetchAt: NOW, ...data },
  })
}

const refresh = (fetcher: Fetcher, extra: Partial<Parameters<typeof refreshSites>[1]> = {}) =>
  refreshSites(db, { fetcher, baseUrl: BASE, now: () => NOW, random: () => 0.5, ...extra })

beforeEach(reset)
afterAll(async () => {
  await reset()
  await db.$disconnect()
})

// ---------------------------------------------------------- harvesting --

describe('harvestSignals', () => {
  it("turns residents' Websites lists into signals, owners and tiers", async () => {
    const ada = await resident('ada', { blogroll: [{ url: 'https://ada.example.org/', mine: true }, { url: 'https://friend.example.org/blog' }] })
    const bo = await resident('bo', { blogroll: [{ label: 'Friend', url: 'https://www.friend.example.org/' }, { url: 'not a url' }] })
    await resident('cy', { blogroll: [{ url: 'https://lonely.example.org/' }] })

    await harvestSignals(db, { baseUrl: BASE, now: NOW })

    const sites = await db.site.findMany({ orderBy: { key: 'asc' }, select: { key: true, tier: true, ownerId: true, residentSignals: true } })
    expect(sites).toEqual([
      { key: 'ada.example.org', tier: 'resident', ownerId: ada, residentSignals: 1 },
      { key: 'friend.example.org', tier: 'community', ownerId: null, residentSignals: 2 },
      { key: 'lonely.example.org', tier: 'candidate', ownerId: null, residentSignals: 1 },
    ])
    expect(await db.siteSignal.count({ where: { userId: bo, kind: 'blogroll' } })).toBe(1)
  })

  it('reads only public profiles, and skips blocked hosts, opted-out sites and links to this site', async () => {
    await db.blockedSite.create({ data: { domain: 'youtube.com', category: 'video' } })
    await db.siteOptOut.create({ data: { key: 'gone.example.org', via: 'owner' } })
    await resident('ada', {
      blogroll: [
        { url: 'https://m.youtube.com/@ada' },
        { url: 'https://gone.example.org/' },
        { url: `${BASE}/resident/bo` },
        { url: 'https://kept.example.org/' },
      ],
    })
    await resident('hidden', { visibility: 'private', blogroll: [{ url: 'https://secret.example.org/' }] })

    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    expect((await db.site.findMany({ select: { key: true } })).map((s) => s.key)).toEqual(['kept.example.org'])
  })

  it('reads links and 88×31 buttons from live templates and bios, but not from a saved template on the standard layout', async () => {
    await resident('ada', {
      templateMode: 'advanced',
      customTemplate: `<div><a href="https://linked.example.org/">a friend</a>
        <a href="https://buttoned.example.org/"><img src="/buttons/b.gif" width="88" height="31"></a></div>`,
      bio: 'I write at https://bio.example.org/ and <a href="https://bio-link.example.org/">here</a>.',
    })
    await resident('bo', { templateMode: 'default', customTemplate: '<a href="https://old-template.example.org/">x</a>' })

    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    const signals = await db.siteSignal.findMany({ select: { kind: true, site: { select: { key: true, buttonUrl: true } } } })
    expect(signals.map((s) => [s.site.key, s.kind, s.site.buttonUrl]).sort()).toEqual([
      ['bio-link.example.org', 'home_link', null],
      ['bio.example.org', 'home_link', null],
      ['buttoned.example.org', 'home_button', `${BASE}/buttons/b.gif`],
      ['linked.example.org', 'home_link', null],
    ])
  })

  it("counts links on the site's published pages as the first admin's", async () => {
    const admin = await resident('admin', {}, { role: 'admin', ageDays: 400 })
    await resident('admin2', {}, { role: 'admin', ageDays: 10 })
    await db.customPage.create({ data: { slug: 'links', title: 'Links', content: '<a href="https://page.example.org/">p</a>', published: true } })
    await db.customPage.create({ data: { slug: 'draft', title: 'Draft', content: '<a href="https://draft.example.org/">d</a>', published: false } })

    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    const signals = await db.siteSignal.findMany({ select: { userId: true, kind: true, site: { select: { key: true } } } })
    expect(signals).toEqual([{ userId: admin, kind: 'page_link', site: { key: 'page.example.org' } }])
  })

  it('takes a signal back when the link goes, deletes candidates nobody points at, and leaves backlinks alone', async () => {
    const ada = await resident('ada', { blogroll: [{ url: 'https://a.example.org/' }, { url: 'https://b.example.org/' }] })
    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    const b = await db.site.findUniqueOrThrow({ where: { key: 'b.example.org' } })
    await db.siteSignal.create({ data: { siteId: b.id, userId: ada, kind: 'backlink', firstSeenAt: NOW, lastSeenAt: NOW } })

    await db.profile.update({ where: { userId: ada }, data: { blogroll: [{ url: 'https://b.example.org/' }] } })
    const later = new Date(NOW.getTime() + DAY)
    const result = await harvestSignals(db, { baseUrl: BASE, now: later })

    expect(result).toMatchObject({ signalsRemoved: 1, candidatesRemoved: 1 })
    expect((await db.site.findMany({ select: { key: true } })).map((s) => s.key)).toEqual(['b.example.org'])
    // The backlink makes ada b's owner.
    expect(await db.site.findUniqueOrThrow({ where: { key: 'b.example.org' }, select: { ownerId: true, tier: true } })).toEqual({ ownerId: ada, tier: 'resident' })
  })

  it("signals from accounts younger than a week wait (the site stays a candidate)", async () => {
    await resident('ada', { blogroll: [{ url: 'https://shared.example.org/' }] })
    await resident('newbie', { blogroll: [{ url: 'https://shared.example.org/' }] }, { ageDays: 2 })
    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    expect((await db.site.findUniqueOrThrow({ where: { key: 'shared.example.org' } })).tier).toBe('candidate')
  })

  it('makes candidates of sites that listed sites link to, most-linked first, and counts those links', async () => {
    const a = await listedSite('a.example.org')
    const b = await listedSite('b.example.org')
    const cand = await db.site.create({ data: { key: 'cand.example.org', host: 'cand.example.org', url: 'https://cand.example.org/' } })
    await db.siteLink.createMany({
      data: [
        { fromSiteId: a.id, toKey: 'popular.example.org' },
        { fromSiteId: b.id, toKey: 'popular.example.org' },
        { fromSiteId: a.id, toKey: 'b.example.org', toSiteId: b.id },
        { fromSiteId: cand.id, toKey: 'from-candidate.example.org' },
      ],
    })
    await harvestSignals(db, { baseUrl: BASE, now: NOW })

    const popular = await db.site.findUniqueOrThrow({ where: { key: 'popular.example.org' }, select: { tier: true, linkedFromSites: true } })
    expect(popular).toEqual({ tier: 'candidate', linkedFromSites: 2 })
    expect((await db.site.findUniqueOrThrow({ where: { key: 'b.example.org' } })).linkedFromSites).toBe(1)
    expect(await db.site.findUnique({ where: { key: 'from-candidate.example.org' } })).toBeNull()
    expect(MAX_LINK_CANDIDATES_PER_RUN).toBe(200)
  })
})

// ------------------------------------------------------------ refresher --

describe('refreshSites', () => {
  const recent = (days: number) => new Date(NOW.getTime() - days * DAY)

  it('reads robots.txt, the homepage and the feed of a community site', async () => {
    const site = await listedSite('ada.example.org')
    const { fetcher, calls } = fixtures({
      'https://ada.example.org/robots.txt': { body: 'User-agent: *\nDisallow: /private' },
      'https://ada.example.org/': { body: homepage({ title: "Ada's corner", description: 'Knitting and zines', feed: '/feed.xml' }) },
      'https://ada.example.org/feed.xml': {
        headers: { etag: '"v1"', 'last-modified': 'Sat, 18 Oct 2026 10:00:00 GMT' },
        body: rss([
          { url: 'https://ada.example.org/socks', title: 'Socks', date: recent(2), body: `<p>${'word '.repeat(400)}</p>` },
          { url: 'https://ada.example.org/old', title: 'Old', date: recent(200) },
          { url: 'https://ada.example.org/undated', title: 'Undated', date: null },
        ]),
      },
    })

    const stats = await refresh(fetcher)
    expect(stats).toMatchObject({ sites: 1, fetched: 2, failed: 0, itemsAdded: 3 })
    expect(calls.map((c) => [c.url, c.accept.split(',')[0]])).toEqual([
      ['https://ada.example.org/robots.txt', 'text/plain'],
      ['https://ada.example.org/', 'text/html'],
      ['https://ada.example.org/feed.xml', 'application/rss+xml'],
    ])

    const row = await db.site.findUniqueOrThrow({ where: { id: site.id } })
    expect(row).toMatchObject({
      // The feed names the site; the front page's <title> only fills a gap.
      title: 'A feed',
      description: 'Knitting and zines',
      feedUrl: 'https://ada.example.org/feed.xml',
      feedEtag: '"v1"',
      feedLastModified: 'Sat, 18 Oct 2026 10:00:00 GMT',
      status: 'active',
      failCount: 0,
      postsLast90d: 1,
      lastOkAt: NOW,
      homepageCheckedAt: NOW,
      nextFetchAt: new Date(NOW.getTime() + 20 * HOUR),
    })
    expect(row.lastPostAt?.toISOString()).toBe(new Date(Math.floor(recent(2).getTime() / 1000) * 1000).toISOString())

    const socks = await db.siteItem.findFirstOrThrow({ where: { url: 'https://ada.example.org/socks' } })
    expect(socks.excerpt!.length).toBeLessThanOrEqual(LIMITS.community.excerpt)
    expect(socks.excerpt!.endsWith('…')).toBe(true)
  })

  it('asks again with ETag and Last-Modified; a 304 changes nothing but the schedule', async () => {
    await listedSite('ada.example.org', {
      feedUrl: 'https://ada.example.org/feed.xml',
      feedEtag: '"v1"',
      feedLastModified: 'Sat, 18 Oct 2026 10:00:00 GMT',
      homepageCheckedAt: recent(1),
    })
    const { fetcher, calls } = fixtures({ 'https://ada.example.org/feed.xml': { status: 304 } })
    const stats = await refresh(fetcher)
    expect(stats).toMatchObject({ notModified: 1, failed: 0 })
    expect(calls.find((c) => c.url.endsWith('feed.xml'))).toMatchObject({ etag: '"v1"', lastModified: 'Sat, 18 Oct 2026 10:00:00 GMT' })
    expect(calls.some((c) => c.url === 'https://ada.example.org/')).toBe(false)
  })

  it('pool sites: feed only, 10 short entries, back in about a month', async () => {
    const site = await db.site.create({
      data: { key: 'kagi.example.org', host: 'kagi.example.org', url: 'https://kagi.example.org/', feedUrl: 'https://kagi.example.org/index.xml', source: 'pool', tier: 'pool', nextFetchAt: NOW },
    })
    const items = Array.from({ length: 15 }, (_, i) => ({ url: `https://kagi.example.org/p${i}`, title: `P${i}`, date: recent(i + 1), body: 'long '.repeat(200) }))
    const { fetcher, urls } = fixtures({ 'https://kagi.example.org/index.xml': { body: rss(items, 'Kagi person') } })

    await refresh(fetcher)
    expect(urls()).toEqual(['https://kagi.example.org/robots.txt', 'https://kagi.example.org/index.xml'])
    const stored = await db.siteItem.findMany({ where: { siteId: site.id }, orderBy: { publishedAt: 'desc' } })
    expect(stored.map((s) => s.title)).toEqual(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'])
    expect(Math.max(...stored.map((s) => s.excerpt!.length))).toBeLessThanOrEqual(LIMITS.pool.excerpt)
    const row = await db.site.findUniqueOrThrow({ where: { id: site.id } })
    expect(row.title).toBe('Kagi person')
    expect(row.nextFetchAt.getTime() - NOW.getTime()).toBe(30 * DAY)
  })

  it('robots.txt that shuts us out opts the whole host out, and the harvest leaves it out after', async () => {
    await listedSite('tilde.example.org/~ada')
    await listedSite('tilde.example.org/~bo')
    await resident('cy', { blogroll: [{ url: 'https://tilde.example.org/~bo/' }] })
    const { fetcher } = fixtures({ 'https://tilde.example.org/robots.txt': { body: 'User-agent: ThreadsteadBot\nDisallow: /' } })

    const stats = await refresh(fetcher)
    expect(stats.optedOut).toBe(1)
    expect(await db.site.count()).toBe(0)
    expect(await db.siteOptOut.findMany({ select: { key: true, via: true } })).toEqual([{ key: 'tilde.example.org', via: 'robots' }])

    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    expect(await db.site.count()).toBe(0)
  })

  it('a noindex homepage opts out just that site', async () => {
    await listedSite('tilde.example.org/~ada')
    await listedSite('tilde.example.org/~bo', { homepageCheckedAt: recent(1), feedUrl: 'https://tilde.example.org/~bo/feed' })
    const { fetcher } = fixtures({
      'https://tilde.example.org/~ada/': { body: homepage({ head: '<meta name="robots" content="noindex">' }) },
      'https://tilde.example.org/~bo/feed': { body: rss([]) },
    })
    await refresh(fetcher)
    expect((await db.site.findMany({ select: { key: true } })).map((s) => s.key)).toEqual(['tilde.example.org/~bo'])
    expect(await db.siteOptOut.findMany({ select: { key: true, via: true } })).toEqual([{ key: 'tilde.example.org/~ada', via: 'meta' }])
  })

  it('an X-Robots-Tag noindex header opts out too', async () => {
    await listedSite('quiet.example.org')
    const { fetcher } = fixtures({ 'https://quiet.example.org/': { headers: { 'x-robots-tag': 'noindex' }, body: homepage() } })
    await refresh(fetcher)
    expect(await db.site.count()).toBe(0)
  })

  it("doesn't read a feed robots.txt disallows, and doesn't opt the site out for it", async () => {
    await listedSite('ada.example.org', { feedUrl: 'https://ada.example.org/feed.xml', homepageCheckedAt: recent(1) })
    const { fetcher, urls } = fixtures({ 'https://ada.example.org/robots.txt': { body: 'User-agent: *\nDisallow: /feed.xml' } })
    await refresh(fetcher)
    expect(urls()).toEqual(['https://ada.example.org/robots.txt'])
    expect(await db.site.findUniqueOrThrow({ where: { key: 'ada.example.org' }, select: { status: true, failCount: true } })).toEqual({ status: 'active', failCount: 0 })
  })

  it('finds backlinks to residents and links to other sites on the homepage', async () => {
    const ada = await resident('ada')
    await db.blockedSite.create({ data: { domain: 'x.com', category: 'social' } })
    const site = await listedSite('ada.example.org')
    const { fetcher } = fixtures({
      'https://ada.example.org/': {
        body: homepage({
          head: `<link rel="me" href="${BASE}/resident/ADA">`,
          body: `<a href="https://friend.example.org/">friend</a><a href="https://friend.example.org/other">again</a>
            <a href="https://x.com/ada">x</a><a href="/about">self</a><a href="${BASE}/">home</a>`,
        }),
      },
    })
    await refresh(fetcher)
    expect(await db.siteSignal.findMany({ select: { userId: true, kind: true } })).toEqual([{ userId: ada, kind: 'backlink' }])
    expect((await db.siteLink.findMany({ where: { fromSiteId: site.id }, select: { toKey: true } })).map((l) => l.toKey)).toEqual(['friend.example.org'])

    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    expect(await db.site.findUniqueOrThrow({ where: { id: site.id }, select: { ownerId: true, tier: true } })).toEqual({ ownerId: ada, tier: 'resident' })
  })

  it('follows a "feed" that turns out to be a page to its real feed', async () => {
    await listedSite('ada.example.org', { feedUrl: 'https://ada.example.org/blog/', homepageCheckedAt: recent(1) })
    const { fetcher } = fixtures({
      'https://ada.example.org/blog/': { body: homepage({ feed: 'https://ada.example.org/blog/atom.xml' }) },
      'https://ada.example.org/blog/atom.xml': { body: rss([{ url: 'https://ada.example.org/blog/1', date: recent(1) }]) },
    })
    const stats = await refresh(fetcher)
    expect(stats).toMatchObject({ failed: 0, itemsAdded: 1 })
    expect((await db.site.findUniqueOrThrow({ where: { key: 'ada.example.org' } })).feedUrl).toBe('https://ada.example.org/blog/atom.xml')
  })

  it('reads the feed even when the homepage is broken', async () => {
    await listedSite('ada.example.org', { feedUrl: 'https://ada.example.org/feed.xml' })
    const { fetcher } = fixtures({
      'https://ada.example.org/': { status: 500 },
      'https://ada.example.org/feed.xml': { body: rss([{ url: 'https://ada.example.org/1', date: recent(1) }]) },
    })
    expect(await refresh(fetcher)).toMatchObject({ failed: 0, itemsAdded: 1 })
  })

  it('keeps the newest 50 entries, updates changed ones, and treats future dates as unknown', async () => {
    const site = await listedSite('ada.example.org', { feedUrl: 'https://ada.example.org/feed.xml', homepageCheckedAt: recent(1) })
    let version = 1
    const items = () =>
      Array.from({ length: 60 }, (_, i) => ({ url: `https://ada.example.org/${i}`, title: `T${i} v${version}`, date: recent(i + 1) })).concat([
        { url: 'https://ada.example.org/future', title: 'Future', date: new Date(NOW.getTime() + 30 * DAY) },
      ])
    const { fetcher } = fixtures({ 'https://ada.example.org/feed.xml': () => ({ body: rss(items()) }) })

    await refresh(fetcher)
    expect(await db.siteItem.count({ where: { siteId: site.id } })).toBe(50)
    expect(await db.siteItem.findFirst({ where: { url: 'https://ada.example.org/future' } })).toBeNull()

    version = 2
    await db.site.update({ where: { id: site.id }, data: { nextFetchAt: NOW } })
    const stats = await refresh(fetcher)
    expect(stats.itemsAdded).toBe(0)
    expect((await db.siteItem.findFirstOrThrow({ where: { url: 'https://ada.example.org/0' } })).title).toBe('T0 v2')
  })

  it('community sites go stale after a week of failures and dead after 5 failures over two weeks; hidden stays hidden', async () => {
    const failing = await listedSite('down.example.org', { feedUrl: 'https://down.example.org/feed', homepageCheckedAt: recent(1), lastOkAt: recent(8), failCount: 1 })
    const dying = await listedSite('dying.example.org', { feedUrl: 'https://dying.example.org/feed', homepageCheckedAt: recent(1), lastOkAt: recent(20), failCount: 4 })
    const hidden = await listedSite('hidden.example.org', { status: 'hidden', feedUrl: 'https://hidden.example.org/feed', homepageCheckedAt: recent(1) })
    const { fetcher } = fixtures({
      'https://down.example.org/feed': new Error('network error (ECONNREFUSED)'),
      'https://dying.example.org/feed': { status: 410 },
    })
    await refresh(fetcher, { onlyKeys: ['down.example.org', 'dying.example.org', 'hidden.example.org'] })

    expect(await db.site.findUniqueOrThrow({ where: { id: failing.id } })).toMatchObject({
      status: 'stale',
      failCount: 2,
      lastError: 'network error (ECONNREFUSED)',
      nextFetchAt: new Date(NOW.getTime() + 2 * DAY - 4 * HOUR),
    })
    expect(await db.site.findUniqueOrThrow({ where: { id: dying.id } })).toMatchObject({ status: 'dead', failCount: 5, lastError: 'feed returned 410' })
    expect((await db.site.findUniqueOrThrow({ where: { id: hidden.id } })).status).toBe('hidden')
  })

  it('an unreachable robots.txt is a failure, not an opt-out', async () => {
    await listedSite('flaky.example.org')
    const { fetcher, urls } = fixtures({ 'https://flaky.example.org/robots.txt': { status: 503 } })
    expect(await refresh(fetcher)).toMatchObject({ failed: 1, optedOut: 0 })
    expect(urls()).toEqual(['https://flaky.example.org/robots.txt'])
    expect((await db.site.findUniqueOrThrow({ where: { key: 'flaky.example.org' } })).lastError).toBe('robots.txt unreachable')
  })

  it('drops pool sites after 3 failed rotations or a year of silence', async () => {
    const pool = (key: string, data: Record<string, unknown> = {}) =>
      db.site.create({ data: { key, host: key, url: `https://${key}/`, feedUrl: `https://${key}/feed`, source: 'pool', tier: 'pool', nextFetchAt: NOW, ...data } })
    await pool('third-strike.example.org', { failCount: 2 })
    await pool('first-strike.example.org')
    await pool('silent.example.org')
    const { fetcher } = fixtures({
      'https://third-strike.example.org/feed': { status: 500 },
      'https://first-strike.example.org/feed': { status: 500 },
      'https://silent.example.org/feed': { body: rss([{ url: 'https://silent.example.org/1', date: recent(400) }]) },
    })
    const stats = await refresh(fetcher)
    expect(stats.dropped).toBe(2)
    expect((await db.site.findMany({ select: { key: true, failCount: true } }))).toEqual([{ key: 'first-strike.example.org', failCount: 1 }])
  })

  it('checks a new candidate once: its homepage, for a title and a feed, never its feed', async () => {
    await db.site.create({ data: { key: 'new.example.org', host: 'new.example.org', url: 'https://new.example.org/' } })
    await db.site.create({ data: { key: 'broken.example.org', host: 'broken.example.org', url: 'https://broken.example.org/' } })
    const { fetcher, urls } = fixtures({
      'https://new.example.org/': { body: homepage({ title: 'New person', feed: '/rss' }) },
      'https://broken.example.org/': { status: 404 },
    })
    await refresh(fetcher)
    expect(urls()).not.toContain('https://new.example.org/rss')
    expect(await db.site.findUniqueOrThrow({ where: { key: 'new.example.org' }, select: { title: true, feedUrl: true, tier: true } })).toEqual({
      title: 'New person',
      feedUrl: 'https://new.example.org/rss',
      tier: 'candidate',
    })
    const broken = await db.site.findUniqueOrThrow({ where: { key: 'broken.example.org' } })
    expect(broken.homepageCheckedAt).toEqual(NOW)

    const again = fixtures({})
    await refresh(again.fetcher)
    expect(again.urls()).toEqual([])
  })

  it('stops starting sites after the deadline', async () => {
    await listedSite('a.example.org', { feedUrl: 'https://a.example.org/f', homepageCheckedAt: recent(1) })
    const { fetcher, urls } = fixtures({})
    const stats = await refresh(fetcher, { deadline: new Date(NOW.getTime() - 1) })
    expect(stats.sites).toBe(0)
    expect(urls()).toEqual([])
  })
})

// --------------------------------------------------------- Kagi import --

const kagiList = (n: number, extra: string[] = []) =>
  ['# comment', ...Array.from({ length: n }, (_, i) => `https://site${i}.example.org/feed.xml`), ...extra, ''].join('\n')

describe('importKagiList', () => {
  it('refuses a list that is suspiciously short', async () => {
    await expect(importKagiList(db, kagiList(10))).rejects.toThrow('refusing to import')
    expect(await db.site.count()).toBe(0)
  })

  it('adds pool sites spread over a month, skipping shared feed hosts, blocked, opted-out and duplicate sites', async () => {
    await db.blockedSite.create({ data: { domain: 'medium.com', category: 'platform' } })
    await db.siteOptOut.create({ data: { key: 'site5.example.org', via: 'owner' } })
    const result = await importKagiList(
      db,
      kagiList(1000, [
        'https://feeds.feedburner.com/someone',
        'https://www.blogger.com/feeds/123/posts/default',
        'https://someone.medium.com/feed',
        'https://site1.example.org/other-feed.xml',
        'ftp://nope.example.org/feed',
      ]),
      { now: NOW, random: () => 0.25 }
    )
    expect(result).toEqual({ listed: 1004, added: 999, updated: 0, removed: 0, skipped: 5 })
    const one = await db.site.findUniqueOrThrow({ where: { key: 'site1.example.org' } })
    expect(one).toMatchObject({ source: 'pool', tier: 'pool', feedUrl: 'https://site1.example.org/feed.xml', url: 'https://site1.example.org/' })
    expect(one.nextFetchAt.getTime() - NOW.getTime()).toBe(7.5 * DAY)
  })

  it('re-importing drops pool sites that left the list, updates moved feeds, and never touches community sites', async () => {
    await importKagiList(db, kagiList(1100), { now: NOW })
    await db.site.update({ where: { key: 'site1050.example.org' }, data: { source: 'community', tier: 'community' } })
    // A community site that a resident added before it had a feed.
    await db.site.update({ where: { key: 'site3.example.org' }, data: { source: 'community', tier: 'community', feedUrl: null } })

    const moved = kagiList(1000).replace('https://site2.example.org/feed.xml', 'https://site2.example.org/new.xml')
    const result = await importKagiList(db, moved, { now: NOW })
    expect(result.removed).toBe(99)
    expect(await db.site.findUnique({ where: { key: 'site1050.example.org' } })).not.toBeNull()
    expect(await db.site.findUnique({ where: { key: 'site1099.example.org' } })).toBeNull()
    expect((await db.site.findUniqueOrThrow({ where: { key: 'site2.example.org' } })).feedUrl).toBe('https://site2.example.org/new.xml')
    expect(await db.site.findUniqueOrThrow({ where: { key: 'site3.example.org' }, select: { source: true, feedUrl: true } })).toEqual({
      source: 'community',
      feedUrl: 'https://site3.example.org/feed.xml',
    })
    expect(result.updated).toBe(2)
  })
})

// --------------------------------------------------------------- nightly --

describe('runNightly', () => {
  it('imports the Kagi list when it is due, harvests, refreshes and records the run', async () => {
    await resident('ada', { blogroll: [{ url: 'https://ada.example.org/', mine: true }] })
    const sites = fixtures({
      'https://ada.example.org/': { body: homepage({ title: 'Ada', feed: '/feed' }) },
      'https://ada.example.org/feed': { body: rss([{ url: 'https://ada.example.org/1', date: new Date(NOW.getTime() - DAY) }]) },
    })
    const list = fixtures({ [KAGI_SMALLWEB_URL]: { body: kagiList(1000) } })

    const stats = await runNightly(db, { fetcher: sites.fetcher, listFetcher: list.fetcher, baseUrl: BASE, now: () => NOW, refresh: { poolPerRun: 0, random: () => 0.5 } })

    expect(stats).toMatchObject({ itemsAdded: 1, failed: 0 })
    expect(await db.site.count({ where: { source: 'pool' } })).toBe(1000)
    const runs = await db.indexRun.findMany({ orderBy: { kind: 'asc' }, select: { kind: true, finishedAt: true, error: true, itemsAdded: true } })
    expect(runs).toEqual([
      { kind: 'kagi_import', finishedAt: NOW, error: null, itemsAdded: 1000 },
      { kind: 'nightly', finishedAt: NOW, error: null, itemsAdded: 1 },
    ])

    // Within 28 days the list isn't fetched again.
    await runNightly(db, { fetcher: sites.fetcher, listFetcher: list.fetcher, baseUrl: BASE, now: () => new Date(NOW.getTime() + DAY), refresh: { poolPerRun: 0 } })
    expect(list.calls).toHaveLength(1)
  })

  it("won't start while another run is going, but a crashed run from hours ago doesn't block it", async () => {
    await db.indexRun.create({ data: { kind: 'nightly', startedAt: new Date(NOW.getTime() - HOUR) } })
    const none = fixtures({})
    const opts = { fetcher: none.fetcher, listFetcher: none.fetcher, baseUrl: BASE, refresh: { poolPerRun: 0 } }
    await expect(runNightly(db, { ...opts, now: () => NOW })).rejects.toThrow(RunInProgressError)
    await expect(runNightly(db, { ...opts, now: () => new Date(NOW.getTime() + 7 * HOUR) })).resolves.toBeDefined()
  })

  it('a failed Kagi download is logged and the night goes on', async () => {
    const lines: string[] = []
    const none = fixtures({ [KAGI_SMALLWEB_URL]: { status: 500 } })
    await runNightly(db, { fetcher: none.fetcher, listFetcher: none.fetcher, baseUrl: BASE, now: () => NOW, log: (l) => lines.push(l) })
    expect(lines.some((l) => l.includes('Kagi import failed'))).toBe(true)
    const runs = await db.indexRun.findMany({ orderBy: { kind: 'asc' }, select: { kind: true, error: true } })
    expect(runs).toEqual([
      { kind: 'kagi_import', error: 'Kagi list returned 500' },
      { kind: 'nightly', error: null },
    ])
  })
})
