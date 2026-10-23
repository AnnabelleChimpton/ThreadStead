/**
 * Bluesky handles on residents' addresses against a real Postgres
 * (design/home-subdomains/SCOPE.md, Phase 1 and Names): which DIDs the
 * endpoint serves, linking and checking with Bluesky and plc.directory
 * faked, moderation and deletion stopping it, the a_b / a-b rule,
 * tombstones, and the migration's label backfill.
 */
import { execSync } from 'child_process'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'

process.env.RESIDENT_SUBDOMAIN_APEX = 'homepageagain.test'

// The site page renders through the resident page's loader, which reads
// /api/profile over HTTP; here it's a stand-in that records what it was asked
const mockProfileProps = jest.fn(async (ctx: { params: { username: string } }) => ({
  props: { username: ctx.params.username, ownerUserId: 'x' },
}))
jest.mock('@/pages/resident/[username]/index', () => ({
  __esModule: true,
  default: () => null,
  getServerSideProps: (ctx: never) => mockProfileProps(ctx),
}))

jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  getPublicRingHubClient: () => null,
  getRingHubClient: () => null,
}))

import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { invalidateServedDids, servedDidFor } from '@/lib/domain/bluesky/served-dids'
import {
  checkBluesky,
  getBlueskyState,
  linkBluesky,
  linkedBlueskyHandle,
  recheckBlueskyLinks,
  unlinkBluesky,
  verifiedBlueskyHandle,
} from '@/lib/domain/bluesky/handle-links'
import type { Fetcher } from '@/lib/domain/bluesky/atproto'
import { moderateUser } from '@/lib/domain/users/moderation'
import { deleteUserAccount } from '@/lib/domain/users/account-removal'
import { handleUnavailableReason } from '@/lib/domain/users/handle-availability'
import atprotoDidRoute from '@/pages/api/atproto-did/[label]'
import { getServerSideProps as sitePageProps } from '@/pages/site/[label]'
import profileRoute from '@/pages/api/profile/[username]'

const HOUR = 60 * 60 * 1000
const DID_A = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const DID_B = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb'

let seq = 0
async function resident(handle: string, extra: { createdAt?: Date; label?: string | null } = {}) {
  const id = `u_bsky_${handle.replace(/[^a-z0-9]/g, '')}_${seq++}`
  await db.user.create({
    data: {
      id,
      did: `did:test:bsky:${id}`,
      primaryHandle: `${handle}@${SITE_NAME}`,
      subdomainLabel: extra.label === undefined ? handle.replace(/_/g, '-') : extra.label,
      createdAt: extra.createdAt,
      handles: { create: { handle, host: SITE_NAME } },
    },
  })
  return id
}

async function link(userId: string, did: string, status: 'pending' | 'verified' | 'revoked', pendingUntil?: Date) {
  await db.blueskyHandleLink.create({ data: { userId, did, status, pendingUntil: pendingUntil ?? null } })
}

/** Bluesky's API and plc.directory, as one fake fetcher. */
function bluesky(profiles: Record<string, { did: string; handle: string }>, plc: Record<string, string | null | Error>) {
  const fetcher: Fetcher = async (url) => {
    const profile = url.match(/getProfile\?actor=(.+)$/)
    if (profile) {
      const found = profiles[decodeURIComponent(profile[1])]
      return found
        ? new Response(JSON.stringify({ ...found, displayName: 'Someone' }))
        : new Response(JSON.stringify({ error: 'InvalidRequest' }), { status: 400 })
    }
    const did = url.replace('https://plc.directory/', '')
    const handle = plc[did]
    if (handle instanceof Error) throw handle
    if (handle === undefined) return new Response('', { status: 404 })
    return new Response(JSON.stringify({ id: did, alsoKnownAs: handle ? [`at://${handle}`] : [] }))
  }
  return fetcher
}

function fakeRes() {
  const headers: Record<string, string> = {}
  const r = {
    statusCode: 200,
    body: undefined as unknown,
    headers,
    setHeader: (k: string, v: string) => ((headers[k.toLowerCase()] = v), r),
    status: (c: number) => ((r.statusCode = c), r),
    send: (b: unknown) => ((r.body = b), r),
    json: (b: unknown) => ((r.body = b), r),
    end: () => r,
    redirect: (code: number, url: string) => ((r.statusCode = code), (headers.location = url), r),
  }
  return r
}

async function get(route: (req: NextApiRequest, res: NextApiResponse) => unknown, label: string, method = 'GET') {
  const res = fakeRes()
  await route({ method, query: { label }, headers: {} } as unknown as NextApiRequest, res as unknown as NextApiResponse)
  return res
}

beforeEach(() => invalidateServedDids())

afterAll(async () => {
  await db.$disconnect()
})

describe('what the endpoint serves', () => {
  test('verified, and pending inside its 72 hours; not expired, revoked, unlinked or restricted', async () => {
    const now = new Date()
    const verified = await resident('bs_verified')
    const pending = await resident('bs-pending')
    const expired = await resident('bsexpired')
    const revoked = await resident('bsrevoked')
    const banned = await resident('bsbanned')
    const pastSuspension = await resident('bspastsusp')
    await resident('bsnolink')
    await link(verified, DID_A, 'verified')
    await link(pending, DID_A, 'pending', new Date(now.getTime() + HOUR))
    await link(expired, DID_A, 'pending', new Date(now.getTime() - HOUR))
    await link(revoked, DID_A, 'revoked')
    await link(banned, DID_A, 'verified')
    await link(pastSuspension, DID_B, 'verified')
    await db.user.update({ where: { id: banned }, data: { moderationStatus: 'banned' } })
    await db.user.update({
      where: { id: pastSuspension },
      data: { moderationStatus: 'suspended', suspendedUntil: new Date(now.getTime() - HOUR) },
    })

    expect(await servedDidFor('bs-verified')).toBe(DID_A)
    expect(await servedDidFor('bs-pending')).toBe(DID_A)
    expect(await servedDidFor('bspastsusp')).toBe(DID_B)
    for (const label of ['bsexpired', 'bsrevoked', 'bsbanned', 'bsnolink', 'nobody-here']) {
      expect({ label, did: await servedDidFor(label) }).toEqual({ label, did: null })
    }
    // A pending link that runs out while the copy is in memory stops then
    expect(await servedDidFor('bs-pending', new Date(now.getTime() + 2 * HOUR))).toBeNull()
  })

  test('the route: plain text, cacheable 200 or uncached 404, open to browser clients', async () => {
    const id = await resident('bsroute')
    await link(id, DID_A, 'verified')

    const ok = await get(atprotoDidRoute, 'bsroute')
    expect(ok.statusCode).toBe(200)
    expect(ok.body).toBe(DID_A)
    expect(ok.headers['content-type']).toBe('text/plain; charset=utf-8')
    expect(ok.headers['cache-control']).toBe('public, max-age=300')
    expect(ok.headers['access-control-allow-origin']).toBe('*')

    const missing = await get(atprotoDidRoute, 'bs-nobody')
    expect(missing.statusCode).toBe(404)
    expect(missing.headers['cache-control']).toBe('no-store')
    expect((await get(atprotoDidRoute, 'Bad..Label')).statusCode).toBe(404)
    expect((await get(atprotoDidRoute, 'bsroute', 'POST')).statusCode).toBe(405)
  })

  test('answers from memory: no query per request while the copy is fresh', async () => {
    const id = await resident('bsmemory')
    await link(id, DID_A, 'verified')
    expect(await servedDidFor('bsmemory')).toBe(DID_A)

    const spy = jest.spyOn(db.blueskyHandleLink, 'findMany')
    for (let i = 0; i < 20; i++) await servedDidFor(i % 2 ? 'bsmemory' : `random-${i}`)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('moderation', () => {
  test('a ban stops it at once, and lifting brings it back', async () => {
    const admin = await resident('bsadmin')
    await db.user.update({ where: { id: admin }, data: { role: 'admin' } })
    const id = await resident('bsmod')
    await link(id, DID_A, 'verified')
    expect(await servedDidFor('bsmod')).toBe(DID_A)
    expect(await linkedBlueskyHandle(id)).toBe('bsmod.homepageagain.test')

    await moderateUser({ action: 'ban', reason: 'spam' }, { actorId: admin, userId: id })
    expect(await servedDidFor('bsmod')).toBeNull()
    expect(await verifiedBlueskyHandle(id)).toBeNull()

    await moderateUser({ action: 'lift' }, { actorId: admin, userId: id })
    expect(await servedDidFor('bsmod')).toBe(DID_A)
  })
})

describe('linking and checking', () => {
  // The re-check looks at every verified link, so start each test with none
  beforeEach(() => db.blueskyHandleLink.deleteMany({}))

  test('paste a handle → pending and served → Check → verified → daily re-check revokes when it moves', async () => {
    const id = await resident('bs_flow')
    const address = 'bs-flow.homepageagain.test'
    const before = bluesky({ 'flow.bsky.social': { did: DID_A, handle: 'flow.bsky.social' } }, { [DID_A]: 'flow.bsky.social' })

    const linked = await linkBluesky(id, '@flow.bsky.social', { fetcher: before })
    expect(linked.address).toBe(address)
    expect(linked.link).toMatchObject({ did: DID_A, status: 'pending', previousHandle: 'flow.bsky.social' })
    expect(new Date(linked.link!.pendingUntil!).getTime()).toBeGreaterThan(Date.now() + 71 * HOUR)
    expect(await servedDidFor('bs-flow')).toBe(DID_A)

    // Not switched over in Bluesky yet
    const notYet = await checkBluesky(id, { fetcher: before })
    expect(notYet.link).toMatchObject({ status: 'pending', lastCheckNote: expect.stringContaining('@flow.bsky.social') })
    expect(await verifiedBlueskyHandle(id)).toBeNull()

    // plc.directory down: nothing changes
    const down = await checkBluesky(id, { fetcher: bluesky({}, { [DID_A]: new Error('down') }) })
    expect(down.link).toMatchObject({ status: 'pending', lastCheckNote: expect.stringContaining("couldn't reach") })

    const after = bluesky({}, { [DID_A]: address })
    const done = await checkBluesky(id, { fetcher: after })
    expect(done.link).toMatchObject({ status: 'verified', lastCheckNote: null, pendingUntil: null })
    expect(await verifiedBlueskyHandle(id)).toBe(address)
    expect(await servedDidFor('bs-flow')).toBe(DID_A)

    // A day later, still theirs
    const tomorrow = new Date(Date.now() + 25 * HOUR)
    expect(await recheckBlueskyLinks({ fetcher: after, now: tomorrow, gapMs: 0 })).toMatchObject({ verified: 1, revoked: 0 })
    // and the day after, they've moved to another handle
    const moved = bluesky({}, { [DID_A]: 'elsewhere.example' })
    const later = new Date(Date.now() + 50 * HOUR)
    const stats = await recheckBlueskyLinks({ fetcher: moved, now: later, gapMs: 0 })
    expect(stats).toMatchObject({ revoked: 1 })
    expect(await servedDidFor('bs-flow', later)).toBeNull()
    expect((await getBlueskyState(id)).link).toMatchObject({
      status: 'revoked',
      lastCheckNote: expect.stringContaining('@elsewhere.example'),
    })
  })

  test('the re-check leaves alone what it can’t reach, and what was checked recently', async () => {
    const id = await resident('bsrecheck')
    await db.blueskyHandleLink.create({ data: { userId: id, did: DID_B, status: 'verified', lastCheckedAt: new Date() } })
    const moved = bluesky({}, { [DID_B]: 'elsewhere.example' })
    await recheckBlueskyLinks({ fetcher: moved, gapMs: 0 })
    expect(await servedDidFor('bsrecheck')).toBe(DID_B)

    const later = new Date(Date.now() + 25 * HOUR)
    await recheckBlueskyLinks({ fetcher: bluesky({}, { [DID_B]: new Error('down') }), now: later, gapMs: 0 })
    expect((await getBlueskyState(id)).link).toMatchObject({ status: 'verified', lastCheckNote: null })
  })

  test('linking an account that already uses the address verifies straight away', async () => {
    const id = await resident('bsagain')
    const address = 'bsagain.homepageagain.test'
    const fetcher = bluesky({ [DID_B]: { did: DID_B, handle: address } }, { [DID_B]: address })
    const result = await linkBluesky(id, DID_B, { fetcher })
    expect(result.link).toMatchObject({ status: 'verified', previousHandle: null })
  })

  test('refusals: bad input, their own address, unknown accounts, did:web, no address', async () => {
    const id = await resident('bsrefuse')
    const fetcher = bluesky({}, {})
    await expect(linkBluesky(id, 'not a handle', { fetcher })).rejects.toMatchObject({ status: 400 })
    await expect(linkBluesky(id, 'bsrefuse.homepageagain.test', { fetcher })).rejects.toMatchObject({ status: 400 })
    await expect(linkBluesky(id, 'ghost.bsky.social', { fetcher })).rejects.toMatchObject({ status: 404 })
    await expect(linkBluesky(id, 'did:web:example.com', { fetcher })).rejects.toMatchObject({ status: 400 })

    const noLabel = await resident('bs_nolabel', { label: null })
    await expect(linkBluesky(noLabel, 'x.bsky.social', { fetcher })).rejects.toMatchObject({ status: 400 })
    expect((await getBlueskyState(noLabel)).noAddressReason).toBeTruthy()

    const infra = await resident('cdn')
    expect((await getBlueskyState(infra)).address).toBeNull()
    await expect(linkBluesky(infra, 'x.bsky.social', { fetcher })).rejects.toMatchObject({ status: 400 })
  })

  test('unlinking stops serving and keeps the row', async () => {
    const id = await resident('bsunlink')
    await link(id, DID_A, 'verified')
    expect(await servedDidFor('bsunlink')).toBe(DID_A)
    const state = await unlinkBluesky(id)
    expect(state.link).toMatchObject({ status: 'revoked' })
    expect(await servedDidFor('bsunlink')).toBeNull()
    expect(await db.blueskyHandleLink.count({ where: { userId: id } })).toBe(1)
  })

  test('the DID is not unique: two residents can point at the same one', async () => {
    const a = await resident('bsdupa')
    const b = await resident('bsdupb')
    const fetcher = bluesky({ 'same.bsky.social': { did: DID_A, handle: 'same.bsky.social' } }, {})
    await linkBluesky(a, 'same.bsky.social', { fetcher })
    await linkBluesky(b, 'same.bsky.social', { fetcher })
    expect(await servedDidFor('bsdupa')).toBe(DID_A)
    expect(await servedDidFor('bsdupb')).toBe(DID_A)
  })
})

describe('names', () => {
  test('a_b and a-b exclude each other; an exact match is "taken"', async () => {
    await resident('nm_ab')
    expect(await handleUnavailableReason('nm_ab')).toBe('taken')
    expect(await handleUnavailableReason('nm-ab')).toBe('same-address')
    expect(await handleUnavailableReason('nm_cd')).toBeNull()
  })

  test('a legacy Handle without a label still blocks the other spelling', async () => {
    await resident('nm_legacy', { label: null })
    expect(await handleUnavailableReason('nm-legacy')).toBe('same-address')
  })

  test('a live tombstone holds both spellings; an expired one lets go', async () => {
    await db.handleTombstone.create({ data: { handle: 'nm_gone', subdomainLabel: 'nm-gone', expiresAt: new Date(Date.now() + HOUR) } })
    await db.handleTombstone.create({ data: { handle: 'nm_forever', subdomainLabel: 'nm-forever', expiresAt: null } })
    await db.handleTombstone.create({ data: { handle: 'nm_old', subdomainLabel: 'nm-old', expiresAt: new Date(Date.now() - HOUR) } })
    expect(await handleUnavailableReason('nm_gone')).toBe('held')
    expect(await handleUnavailableReason('nm-gone')).toBe('held')
    expect(await handleUnavailableReason('nm_forever')).toBe('held')
    expect(await handleUnavailableReason('nm_old')).toBeNull()
  })

  test('the unique label refuses the second spelling at the database', async () => {
    await resident('nm_race')
    await expect(resident('nm-race')).rejects.toMatchObject({ code: 'P2002' })
  })
})

describe('deleting an account', () => {
  test('an admin delete tombstones the name for good, stops serving, and the address shows 410', async () => {
    const admin = await resident('dl_admin')
    await db.user.update({ where: { id: admin }, data: { role: 'admin' } })
    const id = await resident('dl_spam')
    await link(id, DID_A, 'verified')
    await moderateUser({ action: 'ban', reason: 'spam' }, { actorId: admin, userId: id })

    const result = await deleteUserAccount({ actorId: admin, userId: id, reason: 'spam' })
    expect(result.deleted).toBe(true)
    expect(await db.handleTombstone.findMany({ where: { subdomainLabel: 'dl-spam' } })).toEqual([
      expect.objectContaining({ handle: 'dl_spam', blueskyLinked: true, removedForAbuse: true, expiresAt: null }),
    ])
    expect(await servedDidFor('dl-spam')).toBeNull()
    expect(await handleUnavailableReason('dl-spam')).toBe('held')

    const page = await sitePage('dl-spam')
    expect(page.statusCode).toBe(410)
    expect(page.result).toEqual({ props: { closed: true, mainSiteUrl: expect.any(String), onResidentHost: true } })
  })
})

/** The site page's server side, as middleware calls it for https://<label>.<apex>/ */
async function sitePage(label: string | null, extraHeaders: Record<string, string> = {}, query: Record<string, string> = {}) {
  const res = { statusCode: 200 }
  const headers: Record<string, string> = { ...extraHeaders }
  if (label) headers['x-resident-label'] = label
  const result = await sitePageProps({ req: { headers }, res, query, params: {}, resolvedUrl: '/' } as never)
  return { statusCode: res.statusCode, result }
}

describe('their page on their address', () => {
  beforeEach(() => mockProfileProps.mockClear())

  test("renders the resident page's props for them, signed out, marked as on their own host", async () => {
    await resident('st_a_b')
    const page = await sitePage('st-a-b', { cookie: 'retro_session=someone.secret' }, { tab: 'guestbook' })
    expect(mockProfileProps).toHaveBeenCalledTimes(1)
    const ctx = mockProfileProps.mock.calls[0][0] as unknown as {
      params: unknown
      query: unknown
      req: { headers: Record<string, string> }
    }
    expect(ctx.params).toEqual({ username: 'st_a_b' })
    expect(ctx.query).toEqual({ tab: 'guestbook' })
    expect(ctx.req.headers.cookie).toBeUndefined()
    expect(page.result).toEqual({
      props: { username: 'st_a_b', ownerUserId: 'x', residentHost: { mainSiteUrl: expect.any(String), username: 'st_a_b' } },
    })
  })

  test('nobody at that address goes to the front page; no label at all is a 404', async () => {
    expect((await sitePage('st-nobody')).result).toEqual({ redirect: { destination: expect.stringMatching(/\/$/), statusCode: 302 } })
    expect((await sitePage(null)).result).toEqual({ notFound: true })
    expect(mockProfileProps).not.toHaveBeenCalled()
  })
})

describe('the profile API names the address as canonical for public profiles only', () => {
  async function profile(username: string) {
    const res = fakeRes()
    await profileRoute({ method: 'GET', query: { username }, headers: {} } as unknown as NextApiRequest, res as unknown as NextApiResponse)
    return res
  }

  test('public: https://<label>.<apex>/; not public: no address; an infra label: none', async () => {
    const pub = await resident('cn_pub')
    await db.profile.create({ data: { userId: pub, visibility: 'public' } })
    expect((await profile('cn_pub')).body).toMatchObject({ siteUrl: expect.stringMatching(/^https?:\/\/cn-pub\.homepageagain\.test(:\d+)?\/$/) })

    const friends = await resident('cn_friends')
    await db.profile.create({ data: { userId: friends, visibility: 'friends' } })
    expect((await profile('cn_friends')).statusCode).toBe(403)

    const infra = await resident('cn_infra')
    await db.profile.create({ data: { userId: infra, visibility: 'public' } })
    await db.user.update({ where: { id: infra }, data: { subdomainLabel: 'matrix' } })
    expect((await profile('cn_infra')).body).toMatchObject({ siteUrl: null })
  })
})

describe('the migration', () => {
  test('backfills labels, the older account winning a collision, and re-runs cleanly', async () => {
    const older = await resident('mg_x', { label: null, createdAt: new Date('2025-01-01') })
    const newer = await resident('mg-x', { label: null, createdAt: new Date('2026-01-01') })
    const plain = await resident('mg_y', { label: null })
    const kept = await resident('mg_z', { label: 'mg-z' })

    const root = path.resolve(__dirname, '..', '..')
    const run = () =>
      execSync(
        'npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261108000000_bluesky_handles/migration.sql',
        { cwd: root, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] }
      )
    run()
    run()

    const labels = Object.fromEntries(
      (await db.user.findMany({ where: { id: { in: [older, newer, plain, kept] } }, select: { id: true, subdomainLabel: true } })).map(
        (u) => [u.id, u.subdomainLabel]
      )
    )
    expect(labels).toEqual({ [older]: 'mg-x', [newer]: null, [plain]: 'mg-y', [kept]: 'mg-z' })
  })
})
