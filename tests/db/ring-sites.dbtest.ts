/**
 * Rings for any site against a real Postgres (the hub and the web are
 * fakes): which stop each member is (lib/rings/walk.ts), proving and
 * re-checking a site (lib/rings/sites.ts), adding it to a ring by the ring's
 * rule and what the ring's host can do (lib/rings/stops.ts), and the counters.
 */
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'
import type { Fetcher } from '@/lib/indie-index/http'
import { cameFromSite, checkSite, MAX_SITES, addSite, SiteError } from '@/lib/rings/sites'
import { setStop, stewardStop, setOutsideSitesRule } from '@/lib/rings/stops'
import { ringStops, walkFromSite } from '@/lib/rings/walk'
import { clicksBySite, countDoorway } from '@/lib/rings/counts'

const BASE = 'https://hpa.example.org'
const DAY = 24 * 60 * 60 * 1000

let seq = 0
async function resident(handle: string, opts: { visibility?: Visibility; suspended?: boolean } = {}) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:user:${handle}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, seq++)),
      ...(opts.suspended && { moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() + 7 * DAY) }),
      handles: { create: { handle, host: SITE_NAME } },
      profile: { create: { displayName: handle.toUpperCase(), visibility: opts.visibility ?? 'public' } },
    },
  })
  await db.userHomeConfig.create({ data: { userId: id } })
  await db.userDID.create({
    data: { userId: id, did: `did:test:${handle}`, userHash: `hash_${handle}`, publicKeyMultibase: 'pk', secretKeyEncrypted: 'sk' },
  })
  return id
}

async function site(userId: string, host: string, state: 'pending' | 'verified' | 'resting' | 'removed' = 'verified') {
  return db.externalSite.create({ data: { id: `site_${host.split('.')[0]}`, userId, url: `https://${host}/`, siteRef: host, state } })
}

// The ring "knits": ann (1), bob (2), cat (3), private dee (4), suspended eve (5). Owner: ann; moderator: bob.
const ROLES: Record<string, string> = { ann: 'owner', bob: 'moderator', cat: 'member', dee: 'member', eve: 'member', fay: 'member' }
let members = ['ann', 'bob', 'cat', 'dee', 'eve']
let joinPolicy = 'OPEN'
let visibility = 'PUBLIC'
// Fakes: typed loosely, the federation suite checks the real shapes
const hub: any = {
  getRingMembers: jest.fn(async (_slug: string, opts: { role?: string } = {}) => {
    const list = members.filter((h) => !opts.role || ROLES[h] === opts.role)
    return {
      members: list.map((h) => ({ actorDid: `did:test:${h}`, status: 'ACTIVE', role: ROLES[h], handles: [] })),
      total: list.length,
      limit: 100,
      offset: 0,
      hasMore: false,
    }
  }),
  getRing: jest.fn(async (slug: string) => (slug === 'knits' ? { slug, name: 'Cozy Knits', visibility, joinPolicy } : null)),
}
const everyoneIn = async () => ['knits', 'other'].map((slug) => ({ slug, name: slug, visibility: 'PUBLIC' as const, role: 'member' }))

/** A Fetcher answering from a table; anything not listed is a 404. */
function web(pages: Record<string, string | { status?: number; url?: string; body?: string }>): Fetcher {
  return async (req) => {
    const page = pages[req.url]
    if (page === undefined) return { status: 404, url: req.url, headers: new Headers(), body: '' }
    const p = typeof page === 'string' ? { body: page } : page
    return { status: p.status ?? 200, url: p.url ?? req.url, headers: new Headers(), body: p.body ?? '' }
  }
}
const strip = (id: string) => `<html><head><title>Ann's corner</title></head><body>
  <a href="${BASE}/ring/knits/prev?from=${id}">prev</a> <a href="${BASE}/ring/knits/next?from=${id}">next</a></body></html>`

beforeEach(async () => {
  clearCache()
  members = ['ann', 'bob', 'cat', 'dee', 'eve']
  joinPolicy = 'OPEN'
  visibility = 'PUBLIC'
  hub.getRingMembers.mockClear()
  await db.$executeRawUnsafe('TRUNCATE "User", "RingSiteSettings" RESTART IDENTITY CASCADE')
  seq = 0
  await resident('ann')
  await resident('bob')
  await resident('cat')
  await resident('dee', { visibility: 'private' })
  await resident('eve', { suspended: true })
})
afterAll(() => db.$disconnect())

const stopsOf = async (viewerId: string | null = null) => {
  const result = await ringStops(db, { slug: 'knits', viewerId, host: SITE_NAME, hub })
  if (result.kind !== 'stops') throw new Error(result.kind)
  return result.stops.map((s) => [s.handle, s.number, s.site?.url ?? 'home'])
}

describe('stops', () => {
  test("a member's listed, proved site is their stop; anything else falls back to their pixel home", async () => {
    const a = await site('u_ann', 'ann.neocities.org')
    const b = await site('u_bob', 'bob.example.org', 'resting')
    const c = await site('u_cat', 'cat.example.org')
    await db.ringStop.createMany({
      data: [
        { ringSlug: 'knits', externalSiteId: a.id, userId: 'u_ann', status: 'listed' },
        { ringSlug: 'knits', externalSiteId: b.id, userId: 'u_bob', status: 'listed' },
        { ringSlug: 'knits', externalSiteId: c.id, userId: 'u_cat', status: 'pending' },
      ],
    })
    expect(await stopsOf()).toEqual([
      ['ann', 1, 'https://ann.neocities.org/'],
      ['bob', 2, 'home'],
      ['cat', 3, 'home'],
    ])
  })

  test("strangers don't see private or suspended members; the private member sees themself", async () => {
    expect((await stopsOf()).map((s) => s[0])).toEqual(['ann', 'bob', 'cat'])
    expect((await stopsOf('u_dee')).map((s) => s[0])).toEqual(['ann', 'bob', 'cat', 'dee'])
  })

  test('a ring that turned its outside sites off walks pixel homes only', async () => {
    const a = await site('u_ann', 'ann.neocities.org')
    await db.ringStop.create({ data: { ringSlug: 'knits', externalSiteId: a.id, userId: 'u_ann', status: 'listed' } })
    await db.ringSiteSettings.create({ data: { ringSlug: 'knits', outsideSites: 'off' } })
    expect((await stopsOf())[0]).toEqual(['ann', 1, 'home'])
  })

  test('unlisted and private rings have no stops (strips are for public rings)', async () => {
    visibility = 'UNLISTED'
    expect(await ringStops(db, { slug: 'knits', viewerId: null, host: SITE_NAME, hub })).toEqual({ kind: 'none' })
    expect(await ringStops(db, { slug: 'nope', viewerId: null, host: SITE_NAME, hub })).toEqual({ kind: 'none' })
  })
})

describe('walking from a site', () => {
  const walk = (from: string | null, go: 'next' | 'prev' | 'random', random = () => 0) =>
    walkFromSite(db, { slug: 'knits', from, go, host: SITE_NAME, hub, random })

  beforeEach(async () => {
    const b = await site('u_bob', 'bob.example.org')
    await db.ringStop.create({ data: { ringSlug: 'knits', externalSiteId: b.id, userId: 'u_bob', status: 'listed' } })
  })

  test('next and prev go to the stops either side, wrapping round', async () => {
    expect(await walk('site_bob', 'next')).toMatchObject({ kind: 'stop', stop: { handle: 'cat', site: null }, fromSite: { id: 'site_bob' } })
    expect(await walk('site_bob', 'prev')).toMatchObject({ kind: 'stop', stop: { handle: 'ann' } })
    // ann (1) is first: prev wraps to cat (3)
    const a = await site('u_ann', 'ann.example.org', 'pending')
    expect(await walk(a.id, 'prev')).toMatchObject({ kind: 'stop', stop: { handle: 'cat' } })
  })

  test('random never lands on the site you came from', async () => {
    for (const r of [0, 0.4, 0.99]) {
      const result = await walk('site_bob', 'random', () => r)
      expect(result).toMatchObject({ kind: 'stop' })
      expect(result.kind === 'stop' && result.stop.handle).not.toBe('bob')
    }
  })

  test("from a site we don't know: next starts at the first stop, prev at the last", async () => {
    expect(await walk('nosuchsite', 'next')).toMatchObject({ kind: 'stop', stop: { handle: 'ann' }, fromSite: null })
    expect(await walk(null, 'prev')).toMatchObject({ kind: 'stop', stop: { handle: 'cat' } })
    // The walk to bob's stop is his site
    expect(await walk(null, 'next', () => 0)).toMatchObject({ stop: { handle: 'ann' } })
    expect(await walk('site_bob', 'prev')).toMatchObject({ stop: { handle: 'ann', site: null } })
    expect(await walk(null, 'random', () => 0.4)).toMatchObject({ stop: { handle: 'bob', site: { url: 'https://bob.example.org/' } } })
  })

  test('a site whose owner was suspended sends walks on from the start', async () => {
    await db.user.update({ where: { id: 'u_bob' }, data: { moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() + DAY) } })
    expect(await walk('site_bob', 'next')).toMatchObject({ stop: { handle: 'ann' } })
  })
})

describe('proving a site and the weekly check', () => {
  test('adding: one per site, three at most, never this site or a big platform', async () => {
    const added = await addSite(db, 'u_ann', { url: 'Ann.Neocities.org/about' }, BASE)
    expect(added).toMatchObject({ url: 'https://ann.neocities.org/', siteRef: 'ann.neocities.org', state: 'pending' })
    expect(added.id).toMatch(/^[A-Za-z0-9_-]{12}$/)
    await expect(addSite(db, 'u_ann', { url: 'https://ann.neocities.org/' }, BASE)).rejects.toThrow("added that site already")
    await expect(addSite(db, 'u_ann', { url: `${BASE}/resident/ann` }, BASE)).rejects.toThrow(SiteError)
    await expect(addSite(db, 'u_ann', { url: 'https://www.youtube.com/channel/x' }, BASE)).rejects.toThrow('big platform')
    await expect(addSite(db, 'u_ann', { url: 'http://localhost:8080' }, BASE)).rejects.toThrow(SiteError)
    await expect(addSite(db, 'u_ann', { url: 'https://ann.neocities.org/', stripPageUrl: 'https://elsewhere.org/' }, BASE)).rejects.toThrow('same site')
    for (let i = 1; i < MAX_SITES; i++) await addSite(db, 'u_ann', { url: `https://ann${i}.example.org` }, BASE)
    await expect(addSite(db, 'u_ann', { url: 'https://one-more.example.org' }, BASE)).rejects.toThrow(`${MAX_SITES} sites`)
  })

  test('a strip with its id proves it; so do the meta tag and rel=me to their profile', async () => {
    const s = await site('u_ann', 'ann.neocities.org', 'pending')
    const { site: proved, outcome } = await checkSite(db, s, { fetcher: web({ 'https://ann.neocities.org/': strip(s.id) }), baseUrl: BASE })
    expect(outcome).toEqual({ ok: true, method: 'strip', title: "Ann's corner" })
    expect(proved).toMatchObject({ state: 'verified', verifyMethod: 'strip', title: "Ann's corner", missCount: 0 })

    const m = await site('u_bob', 'bob.example.org', 'pending')
    const meta = `<html><head><meta name="homepageagain-verification" content="${m.id}"></head></html>`
    expect((await checkSite(db, m, { fetcher: web({ 'https://bob.example.org/': meta }), baseUrl: BASE })).outcome).toMatchObject({ method: 'meta' })

    const r = await site('u_cat', 'cat.example.org', 'pending')
    const relme = `<a rel="me" href="${BASE}/resident/cat">me</a>`
    expect((await checkSite(db, r, { fetcher: web({ 'https://cat.example.org/': relme }), baseUrl: BASE })).outcome).toMatchObject({ method: 'relme' })
  })

  test("someone else's id, a link to the wrong profile, or a hop to another site doesn't", async () => {
    const s = await site('u_ann', 'ann.neocities.org', 'pending')
    const tries = [
      strip('someoneelse'),
      `<a rel="me" href="${BASE}/resident/bob">me</a>`,
      `<!-- <meta name="homepageagain-verification" content="${s.id}"> -->`,
    ]
    for (const body of tries) {
      const { outcome } = await checkSite(db, s, { fetcher: web({ 'https://ann.neocities.org/': body }), baseUrl: BASE })
      expect(outcome.ok).toBe(false)
    }
    const parked = web({ 'https://ann.neocities.org/': { url: 'https://parked.example.com/', body: strip(s.id) } })
    expect((await checkSite(db, s, { fetcher: parked, baseUrl: BASE })).outcome).toEqual({ ok: false, reason: expect.stringContaining('parked.example.com') })
    expect(await db.externalSite.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ state: 'pending', lastError: expect.any(String) })
  })

  test('a site someone else already proved stays theirs', async () => {
    await site('u_bob', 'ann.neocities.org')
    const mine = await db.externalSite.create({ data: { id: 'site_mine', userId: 'u_ann', url: 'https://ann.neocities.org/', siteRef: 'ann.neocities.org' } })
    const { outcome } = await checkSite(db, mine, { fetcher: web({ 'https://ann.neocities.org/': strip(mine.id) }), baseUrl: BASE })
    expect(outcome).toEqual({ ok: false, reason: 'Someone else has already proved this site is theirs.' })
  })

  test('two misses and it rests (owner told), 30 days resting and it leaves its rings, found again and it is back', async () => {
    const s = await site('u_ann', 'ann.neocities.org')
    await db.ringStop.create({ data: { ringSlug: 'knits', externalSiteId: s.id, userId: 'u_ann', status: 'listed' } })
    await db.ringStop.create({ data: { ringSlug: 'other', externalSiteId: s.id, userId: 'u_ann', status: 'hidden', hiddenByUserId: 'u_bob' } })
    const gone = web({})
    const t0 = new Date()
    const check = async (at: Date, fetcher = gone) =>
      (await checkSite(db, await db.externalSite.findUniqueOrThrow({ where: { id: s.id } }), { fetcher, baseUrl: BASE, now: at })).site

    expect(await check(t0)).toMatchObject({ state: 'verified', missCount: 1 })
    expect(await check(new Date(t0.getTime() + 7 * DAY))).toMatchObject({ state: 'resting', missCount: 2 })
    expect(await db.notification.findMany({ where: { recipientId: 'u_ann', type: 'ring_site' }, select: { data: true } }))
      .toEqual([{ data: expect.objectContaining({ event: 'resting', siteId: s.id }) }])
    expect((await stopsOf())[0]).toEqual(['ann', 1, 'home'])

    expect(await check(new Date(t0.getTime() + 14 * DAY))).toMatchObject({ state: 'resting' })
    expect(await check(new Date(t0.getTime() + 38 * DAY))).toMatchObject({ state: 'removed' })
    // Its listing goes; the host's hide stays theirs
    expect(await db.ringStop.findMany({ where: { externalSiteId: s.id }, select: { ringSlug: true } })).toEqual([{ ringSlug: 'other' }])

    const back = web({ 'https://ann.neocities.org/': strip(s.id) })
    expect(await check(new Date(t0.getTime() + 40 * DAY), back)).toMatchObject({ state: 'verified', missCount: 0, restingSince: null })
  })
})

describe("a site joining a ring, and the ring's host", () => {
  test('an open ring lists a proved site right away; it has to be proved and theirs, one per ring', async () => {
    const pending = await site('u_cat', 'cat.example.org', 'pending')
    await expect(setStop(db, { userId: 'u_cat', site: pending, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })).rejects.toThrow('Prove the site')
    const s = await db.externalSite.update({ where: { id: pending.id }, data: { state: 'verified' } })
    await expect(setStop(db, { userId: 'u_bob', site: s, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })).rejects.toThrow('Not your site')
    await expect(setStop(db, { userId: 'u_cat', site: s, ringSlug: 'knits', on: true, hub, memberships: async () => [] })).rejects.toThrow("not in that ring")

    expect(await setStop(db, { userId: 'u_cat', site: s, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })).toMatchObject({ status: 'listed' })
    // A second site moves the stop
    const s2 = await site('u_cat', 'cat2.example.org')
    await setStop(db, { userId: 'u_cat', site: s2, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })
    expect(await db.ringStop.findMany({ where: { userId: 'u_cat' }, select: { externalSiteId: true } })).toEqual([{ externalSiteId: s2.id }])
    await setStop(db, { userId: 'u_cat', site: s2, ringSlug: 'knits', on: false, hub, memberships: everyoneIn })
    expect(await db.ringStop.count()).toBe(0)
  })

  test('an invitation ring holds it for a yes, and tells its host (not its moderators)', async () => {
    joinPolicy = 'INVITATION'
    const s = await site('u_cat', 'cat.example.org')
    expect(await setStop(db, { userId: 'u_cat', site: s, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })).toMatchObject({ status: 'pending' })
    const told = await db.notification.findMany({ where: { type: 'ring_site' }, orderBy: { recipientId: 'asc' }, select: { recipientId: true, actorId: true, data: true } })
    expect(told).toEqual([
      { recipientId: 'u_ann', actorId: 'u_cat', data: expect.objectContaining({ event: 'waiting', threadRingSlug: 'knits', threadRingName: 'Cozy Knits' }) },
    ])
    expect((await stopsOf())[2]).toEqual(['cat', 3, 'home'])
    // The ring's own host doesn't wait for themself
    const own = await site('u_ann', 'ann.example.org')
    expect(await setStop(db, { userId: 'u_ann', site: own, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })).toMatchObject({ status: 'listed' })

    const stop = await db.ringStop.findFirstOrThrow({ where: { userId: 'u_cat' } })
    for (const stewardId of ['u_cat', 'u_bob']) {
      await expect(stewardStop(db, { stewardId, stopId: stop.id, ringSlug: 'knits', action: 'approve', hub, ring: { name: 'Cozy Knits' } })).rejects.toThrow("Only the ring's host")
    }
    await stewardStop(db, { stewardId: 'u_ann', stopId: stop.id, ringSlug: 'knits', action: 'approve', hub, ring: { name: 'Cozy Knits' } })
    expect((await stopsOf())[2]).toEqual(['cat', 3, 'https://cat.example.org/'])
    expect(await db.notification.count({ where: { recipientId: 'u_cat', actorId: 'u_ann', type: 'ring_site' } })).toBe(1)
  })

  test("hiding is for good: the member falls back to their home and can't swap the site out or remove it", async () => {
    const s = await site('u_cat', 'cat.example.org')
    const stop = await setStop(db, { userId: 'u_cat', site: s, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })
    await stewardStop(db, { stewardId: 'u_ann', stopId: stop!.id, ringSlug: 'knits', action: 'hide', reason: 'Not knitting', hub, ring: { name: 'Cozy Knits' } })
    expect((await stopsOf())[2]).toEqual(['cat', 3, 'home'])
    expect(await db.notification.findFirst({ where: { recipientId: 'u_cat', actorId: 'u_ann' }, select: { data: true } }))
      .toEqual({ data: expect.objectContaining({ event: 'hidden' }) })
    await expect(setStop(db, { userId: 'u_cat', site: s, ringSlug: 'knits', on: false, hub, memberships: everyoneIn })).rejects.toThrow('hid this site')
    const s2 = await site('u_cat', 'cat2.example.org')
    await expect(setStop(db, { userId: 'u_cat', site: s2, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })).rejects.toThrow('hid your other site')
  })

  test("a ring that's off takes no sites; only its host sets that", async () => {
    for (const stewardId of ['u_cat', 'u_bob']) {
      await expect(setOutsideSitesRule(db, { stewardId, ringSlug: 'knits', rule: 'off', hub })).rejects.toThrow("Only the ring's host")
    }
    await setOutsideSitesRule(db, { stewardId: 'u_ann', ringSlug: 'knits', rule: 'off', hub })
    const s = await site('u_cat', 'cat.example.org')
    await expect(setStop(db, { userId: 'u_cat', site: s, ringSlug: 'knits', on: true, hub, memberships: everyoneIn })).rejects.toThrow("doesn't take outside sites")
  })
})

describe('counting', () => {
  test('clicks and arrivals add up per site; an unknown or unproved site is no arrival', async () => {
    const s = await site('u_ann', 'ann.neocities.org')
    await countDoorway(db, 'knits', s.id, 'next')
    await countDoorway(db, 'knits', s.id, 'next')
    expect(await cameFromSite(db, 'knits', s.id)).toEqual({ id: s.id, url: 'https://ann.neocities.org/', name: 'ann.neocities.org' })
    expect(await cameFromSite(db, 'knits', 'nosuchsite')).toBeNull()
    const p = await site('u_bob', 'bob.example.org', 'pending')
    expect(await cameFromSite(db, 'knits', p.id)).toBeNull()

    expect(await db.ringDoorwayCount.findMany({ select: { doorway: true, clicks: true }, orderBy: { doorway: 'asc' } }))
      .toEqual([{ doorway: 'next', clicks: 2 }, { doorway: 'ring', clicks: 1 }])
    expect(Object.fromEntries(await clicksBySite(db, [s.id], new Date(Date.now() - DAY)))).toEqual({ [s.id]: 3 })
  })
})
