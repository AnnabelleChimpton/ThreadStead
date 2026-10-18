/**
 * Indie Index stage 4 against a real Postgres (SEARCH_PLAN.md §3.5):
 * searching and browsing the index, the vouch / opt-out actions and their
 * routes, and the admin route.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
// The routes' CSRF check is apiHandler's (covered by its own tests).
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))

import { getSessionUser } from '@/lib/auth/server'
import { browseIndie, candidateSites, searchIndie } from '@/lib/search/indie'
import { optOutKey, optOutSite, setHidden, unvouch, vouchForSite, vouchForUrl, VOUCHES_PER_DAY } from '@/lib/indie-index/actions'
import { harvestSignals } from '@/lib/indie-index/harvest'
import indieRoute from '@/pages/api/search/indie'
import vouchRoute from '@/pages/api/indie/vouch'
import optOutRoute from '@/pages/api/indie/opt-out'
import adminRoute from '@/pages/api/admin/indie'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-10-19T12:00:00Z')
const BASE = 'https://homepageagain.example.org'

async function reset() {
  await db.$executeRawUnsafe('TRUNCATE "User", "Site", "SiteOptOut", "IndexRun", "BlockedSite" RESTART IDENTITY CASCADE')
}

let seq = 0
async function resident(name: string, opts: { ageDays?: number; visibility?: 'public' | 'private'; role?: 'member' | 'admin' } = {}) {
  const id = `u_${name}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${name}:${seq++}`,
      role: opts.role ?? 'member',
      createdAt: new Date(NOW.getTime() - (opts.ageDays ?? 30) * DAY),
      handles: { create: { handle: name, host: 'local' } },
      profile: { create: { displayName: name.toUpperCase(), visibility: opts.visibility ?? 'public' } },
    },
  })
  return id
}

type Tier = 'resident' | 'vouched' | 'community' | 'pool' | 'candidate'
async function site(
  key: string,
  data: Partial<{ title: string; description: string; tier: Tier; status: 'active' | 'stale' | 'dead' | 'hidden'; lastPostAt: Date; lastOkAt: Date | null; ownerId: string; residentSignals: number; linkedFromSites: number; feedUrl: string; vouchCount: number; source: 'community' | 'pool' }> = {}
) {
  return db.site.create({
    data: { key, host: key.split('/')[0], url: `https://${key}/`, tier: 'community', source: data.tier === 'pool' ? 'pool' : 'community', lastOkAt: NOW, ...data },
  })
}

async function post(siteId: string, url: string, title: string, excerpt: string, publishedAt: Date | null = null) {
  await db.siteItem.create({ data: { siteId, url, title, excerpt, publishedAt } })
}

async function call(handler: any, { method = 'GET', query = {}, body, viewer = null, role = 'member' }: { method?: string; query?: Record<string, string>; body?: unknown; viewer?: string | null; role?: string }) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role } : null)
  const req = { method, query, body, headers: { 'x-forwarded-for': `203.0.113.${seq++ % 250}` } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {} as Record<string, unknown>,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader(k: string, v: unknown) { this.headers[k] = v },
  }
  await handler(req, res as NextApiResponse)
  return res
}

const keys = (page: { results: Array<{ key: string }> }) => page.results.map((r) => r.key)

beforeEach(reset)
afterAll(async () => {
  await reset()
  await db.$disconnect()
})

// ---------------------------------------------------------------- search --

describe('searchIndie', () => {
  it('finds sites by their words and by their posts, with the matching posts attached', async () => {
    const a = await site('knits.example.org', { title: 'Knitting notes', description: 'Socks and shawls' })
    const b = await site('cooking.example.org', { title: 'Soup diary' })
    await post(b.id, 'https://cooking.example.org/sock-soup', 'Sock-shaped dumplings', 'Not actually knitted, but close.', new Date(NOW.getTime() - 2 * DAY))
    await site('other.example.org', { title: 'Trains' })

    const page = await searchIndie('socks', { now: NOW.getTime() })
    expect(keys(page).sort()).toEqual(['cooking.example.org', 'knits.example.org'])
    const cooking = page.results.find((r) => r.key === 'cooking.example.org')!
    expect(cooking.posts).toEqual([
      expect.objectContaining({ url: 'https://cooking.example.org/sock-soup', title: 'Sock-shaped dumplings' }),
    ])
    expect(page.results.find((r) => r.id === a.id)!.posts).toEqual([])
  })

  it('ranks residents’ own sites over vouched over community over the pool, all else equal', async () => {
    for (const tier of ['pool', 'community', 'resident', 'vouched'] as const) {
      await site(`${tier}.example.org`, { title: 'Garden journal', tier })
    }
    expect(keys(await searchIndie('garden journal', { now: NOW.getTime() }))).toEqual([
      'resident.example.org',
      'vouched.example.org',
      'community.example.org',
      'pool.example.org',
    ])
  })

  it('pool sites wait until the bot has read them', async () => {
    await site('unread.example.org', { title: null as never, tier: 'pool', lastOkAt: null })
    await site('read.example.org', { title: 'Unread poems', tier: 'pool' })
    expect(keys(await searchIndie('unread', { now: NOW.getTime() }))).toEqual(['read.example.org'])
  })

  it('a fresh post and more links nudge a site up', async () => {
    await site('quiet.example.org', { title: 'Garden journal', lastPostAt: new Date(NOW.getTime() - 400 * DAY) })
    await site('lively.example.org', { title: 'Garden journal', lastPostAt: new Date(NOW.getTime() - DAY), residentSignals: 4, linkedFromSites: 3 })
    expect(keys(await searchIndie('garden journal', { now: NOW.getTime() }))).toEqual(['lively.example.org', 'quiet.example.org'])
  })

  it('typing a site’s address pins it first', async () => {
    await site('jvns.ca', { title: 'Julia Evans', tier: 'pool' })
    await site('fan.example.org', { title: 'All about jvns.ca and Julia Evans', description: 'jvns jvns jvns', tier: 'resident' })
    expect(keys(await searchIndie('https://www.jvns.ca/', { now: NOW.getTime() }))[0]).toBe('jvns.ca')
  })

  it('finds a site by a typo in its title', async () => {
    await site('quilts.example.org', { title: 'Quilting bee' })
    expect(keys(await searchIndie('quiltng', { now: NOW.getTime() }))).toEqual(['quilts.example.org'])
  })

  it('leaves out candidates, hidden and dead sites, and honours -words', async () => {
    await site('candidate.example.org', { title: 'Garden', tier: 'candidate' })
    await site('hidden.example.org', { title: 'Garden', status: 'hidden' })
    await site('dead.example.org', { title: 'Garden', status: 'dead' })
    await site('stale.example.org', { title: 'Garden', status: 'stale' })
    const veg = await site('veg.example.org', { title: 'Garden' })
    await post(veg.id, 'https://veg.example.org/slugs', 'Slugs again', 'The slugs are back.')
    expect(keys(await searchIndie('garden', { now: NOW.getTime() })).sort()).toEqual(['stale.example.org', 'veg.example.org'])
    // -slugs drops the post that mentions slugs; the site still matches by its title.
    const without = await searchIndie('garden -slugs', { now: NOW.getTime() })
    expect(without.results.find((r) => r.key === 'veg.example.org')?.posts).toEqual([])
    const withSlugs = await searchIndie('slugs', { now: NOW.getTime() })
    expect(withSlugs.results.map((r) => [r.key, r.posts.length])).toEqual([['veg.example.org', 1]])
    await site('nope.example.org', { title: 'Garden slugs' })
    expect(keys(await searchIndie('garden -slugs', { now: NOW.getTime() }))).not.toContain('nope.example.org')
  })

  it('names the owner only when their profile is public, and marks the viewer’s vouches', async () => {
    const ada = await resident('ada')
    const shy = await resident('shy', { visibility: 'private' })
    const mine = await site('ada.example.org', { title: 'Garden', tier: 'resident', ownerId: ada })
    await site('shy.example.org', { title: 'Garden', tier: 'resident', ownerId: shy })
    await db.vouch.create({ data: { siteId: mine.id, userId: shy } })

    const page = await searchIndie('garden', { now: NOW.getTime(), viewerId: shy })
    const byKey = Object.fromEntries(page.results.map((r) => [r.key, r]))
    expect(byKey['ada.example.org']).toMatchObject({ owner: { handle: 'ada', name: 'ADA' }, vouched: true })
    expect(byKey['shy.example.org']).toMatchObject({ owner: null, vouched: false })
  })

  it('pages with offset, and an empty query finds nothing', async () => {
    for (let i = 0; i < 5; i++) await site(`g${i}.example.org`, { title: `Garden ${i}` })
    const first = await searchIndie('garden', { limit: 2, now: NOW.getTime() })
    const second = await searchIndie('garden', { limit: 2, offset: 2, now: NOW.getTime() })
    expect(first.total).toBe(5)
    expect(new Set([...keys(first), ...keys(second)]).size).toBe(4)
    expect(await searchIndie('   ')).toEqual({ results: [], total: 0, capped: false })
  })

  it('survives hostile input', async () => {
    await site('x.example.org', { title: 'Garden' })
    for (const q of ["'; DROP TABLE \"Site\"; --", '%_%', '"unclosed', '-', '!!!', 'a'.repeat(500), '<script>']) {
      await expect(searchIndie(q, { now: NOW.getTime() })).resolves.toBeDefined()
    }
    expect(await db.site.count()).toBe(1)
  })
})

describe('browseIndie and candidateSites', () => {
  it('browse lists community sites newest post first, without the pool or candidates', async () => {
    await site('old.example.org', { lastPostAt: new Date(NOW.getTime() - 30 * DAY) })
    await site('new.example.org', { lastPostAt: new Date(NOW.getTime() - DAY) })
    await site('never.example.org')
    await site('pool.example.org', { tier: 'pool', lastPostAt: NOW })
    await site('cand.example.org', { tier: 'candidate', lastPostAt: NOW })
    const page = await browseIndie()
    expect(keys(page)).toEqual(['new.example.org', 'old.example.org', 'never.example.org'])
    expect(page.total).toBe(3)
  })

  it('candidates: someone points at them and the bot could read them, most-pointed-at first', async () => {
    await site('two.example.org', { tier: 'candidate', residentSignals: 1, linkedFromSites: 1, title: 'Two' })
    await site('one.example.org', { tier: 'candidate', residentSignals: 1, feedUrl: 'https://one.example.org/feed' })
    await site('unread.example.org', { tier: 'candidate', residentSignals: 1 })
    await site('nobody.example.org', { tier: 'candidate', title: 'Nobody' })
    const page = await candidateSites()
    expect(keys(page)).toEqual(['two.example.org', 'one.example.org'])
    expect(page.total).toBe(2)
  })
})

describe('GET /api/search/indie', () => {
  it('searches, browses and lists candidates, with nextOffset', async () => {
    for (let i = 0; i < 3; i++) await site(`g${i}.example.org`, { title: `Garden ${i}` })
    const res = await call(indieRoute, { query: { q: 'garden', limit: '2' } })
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ total: 3, nextOffset: 2 })
    expect((await call(indieRoute, { query: { view: 'browse' } })).body.results).toHaveLength(3)
    expect((await call(indieRoute, { query: { view: 'candidates' } })).body.results).toHaveLength(0)
  })

  it('rejects an unknown view and bad numbers', async () => {
    expect((await call(indieRoute, { query: { view: 'everything' } })).statusCode).toBe(400)
    expect((await call(indieRoute, { query: { q: 'x', limit: 'lots' } })).statusCode).toBe(400)
  })
})

// --------------------------------------------------------------- vouching --

describe('vouching', () => {
  it('adding a new site makes it a candidate; a second resident lists it', async () => {
    const [ada, bo] = [await resident('ada'), await resident('bo')]
    const first = await vouchForUrl(db, { userId: ada, url: 'friend.example.org/blog/post', note: '  lovely   zines ', baseUrl: BASE, now: NOW })
    expect(first).toMatchObject({ key: 'friend.example.org', listed: false, added: true, tier: 'candidate' })
    expect(await db.site.findUniqueOrThrow({ where: { key: 'friend.example.org' }, select: { url: true, source: true } })).toEqual({
      url: 'https://friend.example.org/',
      source: 'community',
    })
    expect((await db.vouch.findFirstOrThrow({ where: { userId: ada } })).note).toBe('lovely zines')

    const second = await vouchForSite(db, { userId: bo, siteId: first.siteId, now: NOW })
    expect(second).toMatchObject({ listed: true, tier: 'vouched' })

    await unvouch(db, { userId: bo, siteId: first.siteId, now: NOW })
    expect((await db.site.findUniqueOrThrow({ where: { id: first.siteId } })).tier).toBe('candidate')
  })

  it('vouching twice is one vouch', async () => {
    const ada = await resident('ada')
    const { siteId } = await vouchForUrl(db, { userId: ada, url: 'https://a.example.org', baseUrl: BASE, now: NOW })
    await vouchForSite(db, { userId: ada, siteId, now: NOW })
    await vouchForUrl(db, { userId: ada, url: 'https://a.example.org/', baseUrl: BASE, now: NOW })
    expect(await db.vouch.count()).toBe(1)
  })

  it.each([
    ['not an address', 'not a url at all', "doesn't look like"],
    ['this site', `${BASE}/resident/ada`, "That's this site"],
    ['a big platform', 'https://www.youtube.com/watch?v=1', 'big platforms'],
    ['a profile on a platform', 'https://mastodon.social/@ada', 'big platforms'],
  ])('refuses %s', async (_label, url, message) => {
    const ada = await resident('ada')
    await expect(vouchForUrl(db, { userId: ada, url, baseUrl: BASE, now: NOW })).rejects.toThrow(message)
    expect(await db.site.count()).toBe(0)
  })

  it('refuses opted-out and hidden sites', async () => {
    const ada = await resident('ada')
    await db.siteOptOut.create({ data: { key: 'nope.example.org', via: 'robots' } })
    await site('hidden.example.org', { status: 'hidden' })
    await expect(vouchForUrl(db, { userId: ada, url: 'https://nope.example.org', baseUrl: BASE, now: NOW })).rejects.toThrow('asked not to be listed')
    await expect(vouchForUrl(db, { userId: ada, url: 'https://hidden.example.org', baseUrl: BASE, now: NOW })).rejects.toThrow("can't be listed")
  })

  it(`caps new vouches at ${VOUCHES_PER_DAY} a day`, async () => {
    const ada = await resident('ada')
    for (let i = 0; i < VOUCHES_PER_DAY; i++) await vouchForUrl(db, { userId: ada, url: `https://s${i}.example.org`, baseUrl: BASE, now: NOW })
    await expect(vouchForUrl(db, { userId: ada, url: 'https://one-more.example.org', baseUrl: BASE, now: NOW })).rejects.toThrow('Try again tomorrow')
    const tomorrow = new Date(NOW.getTime() + DAY + 1000)
    await expect(vouchForUrl(db, { userId: ada, url: 'https://one-more.example.org', baseUrl: BASE, now: tomorrow })).resolves.toMatchObject({ added: true })
  })

  it('POST/DELETE /api/indie/vouch need a signed-in resident', async () => {
    const ada = await resident('ada')
    expect((await call(vouchRoute, { method: 'POST', body: { url: 'https://a.example.org' } })).statusCode).toBe(401)
    const added = await call(vouchRoute, { method: 'POST', body: { url: 'https://a.example.org' }, viewer: ada })
    expect(added.body.result).toMatchObject({ key: 'a.example.org', added: true })
    expect((await call(vouchRoute, { method: 'POST', body: {}, viewer: ada })).statusCode).toBe(400)
    const removed = await call(vouchRoute, { method: 'DELETE', body: { siteId: added.body.result.siteId }, viewer: ada })
    expect(removed.statusCode).toBe(200)
    expect(await db.vouch.count()).toBe(0)
    const blocked = await call(vouchRoute, { method: 'POST', body: { url: 'https://x.com/ada' }, viewer: ada })
    expect(blocked.statusCode).toBe(400)
  })
})

// --------------------------------------------------------------- opt-outs --

describe('opting out', () => {
  it('the owner can take their own site out for good; nobody else can', async () => {
    const [ada, bo] = [await resident('ada'), await resident('bo')]
    const s = await site('ada.example.org', { tier: 'resident', ownerId: ada })
    await expect(optOutSite(db, { siteId: s.id, by: { id: bo, role: 'member' } })).rejects.toThrow('Only the person')
    expect((await call(optOutRoute, { method: 'POST', body: { siteId: s.id }, viewer: bo })).statusCode).toBe(403)

    const res = await call(optOutRoute, { method: 'POST', body: { siteId: s.id }, viewer: ada })
    expect(res.body).toEqual({ key: 'ada.example.org' })
    expect(await db.site.count()).toBe(0)
    expect(await db.siteOptOut.findUniqueOrThrow({ where: { key: 'ada.example.org' } })).toMatchObject({ via: 'owner' })

    // The harvest won't bring it back.
    await db.profile.update({ where: { userId: bo }, data: { blogroll: [{ url: 'https://ada.example.org/' }] } })
    await harvestSignals(db, { baseUrl: BASE, now: NOW })
    expect(await db.site.count()).toBe(0)
  })

  it('the admin can opt out a site, a whole host, or let one back in', async () => {
    await site('tilde.example.org/~ada')
    await site('tilde.example.org/~bo')
    await site('solo.example.org')
    expect(await optOutKey(db, 'tilde.example.org/~ada/')).toEqual({ key: 'tilde.example.org/~ada', removed: 1 })
    expect(await optOutKey(db, 'https://tilde.example.org')).toEqual({ key: 'tilde.example.org', removed: 1 })
    expect((await db.site.findMany({ select: { key: true } })).map((s) => s.key)).toEqual(['solo.example.org'])
  })

  it('hide keeps a site out of search until it’s shown again', async () => {
    const s = await site('x.example.org', { title: 'Garden' })
    await setHidden(db, s.id, true)
    expect((await searchIndie('garden')).results).toHaveLength(0)
    await setHidden(db, s.id, false)
    expect((await searchIndie('garden')).results).toHaveLength(1)
  })
})

describe('/api/admin/indie', () => {
  it('is admins only', async () => {
    const ada = await resident('ada')
    expect((await call(adminRoute, {})).statusCode).toBe(401)
    expect((await call(adminRoute, { viewer: ada })).statusCode).toBe(403)
  })

  it('gives runs, counts, opt-outs and filtered sites, and takes actions', async () => {
    const admin = await resident('boss', { role: 'admin' })
    const s = await site('a.example.org', { tier: 'pool' })
    await site('b.example.org')
    await db.indexRun.create({ data: { kind: 'nightly', finishedAt: NOW, fetched: 5 } })

    const res = await call(adminRoute, { viewer: admin, role: 'admin', query: { tier: 'pool' } })
    expect(res.body).toMatchObject({ total: 1, runs: [expect.objectContaining({ fetched: 5 })] })
    expect(res.body.sites.map((x: { key: string }) => x.key)).toEqual(['a.example.org'])
    expect(res.body.counts).toEqual(expect.arrayContaining([{ tier: 'pool', status: 'active', n: 1 }, { tier: 'community', status: 'active', n: 1 }]))

    await call(adminRoute, { method: 'POST', viewer: admin, role: 'admin', body: { action: 'hide', siteId: s.id } })
    expect((await db.site.findUniqueOrThrow({ where: { id: s.id } })).status).toBe('hidden')
    await call(adminRoute, { method: 'POST', viewer: admin, role: 'admin', body: { action: 'opt-out', address: 'b.example.org' } })
    expect(await db.siteOptOut.count()).toBe(1)
    await call(adminRoute, { method: 'POST', viewer: admin, role: 'admin', body: { action: 'lift-opt-out', key: 'b.example.org' } })
    expect(await db.siteOptOut.count()).toBe(0)
    expect((await call(adminRoute, { method: 'POST', viewer: admin, role: 'admin', body: { action: 'explode' } })).statusCode).toBe(400)
  })
})

describe('the harvest and big platforms', () => {
  it('drops sites on a host that was blocked since, and keeps person.tumblr.com', async () => {
    // Grandfathered so the harvest doesn't drop them as orphan candidates.
    await db.site.create({ data: { key: 'news.example.org', host: 'news.example.org', url: 'https://news.example.org/', grandfathered: true } })
    await db.site.create({ data: { key: 'ada.tumblr.com', host: 'ada.tumblr.com', url: 'https://ada.tumblr.com/', grandfathered: true } })
    await db.blockedSite.create({ data: { domain: 'news.example.org', category: 'news' } })
    const result = await harvestSignals(db, { baseUrl: BASE, now: NOW })
    expect(result.blockedRemoved).toBe(1)
    expect((await db.site.findMany({ select: { key: true } })).map((s) => s.key)).toEqual(['ada.tumblr.com'])
  })
})
