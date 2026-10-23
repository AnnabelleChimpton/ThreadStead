/**
 * The /threadrings directory, the composer's ring list and the slug check,
 * against a mocked hub (threadring-audit 05):
 *  - "My rings" pages past 20 with the hub's own total; "All rings" is every
 *    ring, joined or not, and paging follows the hub's list
 *  - signed out, "My rings" is empty instead of every ring
 *  - only sorts the hub has; searches come back best match first
 *  - rings the viewer blocked are left out
 *  - `my-memberships:<id>` only ever holds the composer's array
 *  - a private ring's slug isn't "available"
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: { userBlock: { findMany: jest.fn() } },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({
  withThreadRingSupport: (handler: any) => (req: any, res: any) => handler(req, res, 'ringhub'),
}))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  getPublicRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))

import listHandler from '@/pages/api/threadrings/index'
import myMembershipsHandler from '@/pages/api/threadrings/my-memberships'
import availabilityHandler from '@/pages/api/threadrings/check-availability/[slug]'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'

async function call(handler: any, query: Record<string, string>) {
  const req = { method: 'GET', query, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this },
    json(payload: any) { this.body = payload; return this },
    setHeader: jest.fn(),
  }
  await handler(req, res as NextApiResponse)
  return res
}

const ring = (slug: string, extra: Record<string, unknown> = {}) => ({
  id: `id-${slug}`, slug, name: slug, visibility: 'PUBLIC', joinPolicy: 'OPEN',
  memberCount: 1, postCount: 0, createdAt: '2026-01-01T00:00:00Z', ...extra,
})
const joined = (role = 'member') => ({ currentUserMembership: { status: 'ACTIVE', role, joinedAt: '2026-01-01T00:00:00Z' } })

// 25 rings; the viewer is in all of them
const allRings = Array.from({ length: 25 }, (_, i) => ring(`ring-${String(i).padStart(2, '0')}`, joined()))
const listRings = jest.fn(async ({ limit = 20, offset = 0 }: any = {}) => ({
  rings: allRings.slice(offset, offset + limit),
  total: allRings.length,
}))
const getMyMemberships = jest.fn(async ({ limit = 20, offset = 0 }: any = {}) => {
  const memberships = allRings.map((r) => ({
    ringSlug: r.slug, ringName: r.name.toUpperCase(), ringVisibility: 'PUBLIC', status: 'ACTIVE', role: 'owner', joinedAt: null,
  })).reverse()
  return { memberships: memberships.slice(offset, offset + limit), total: memberships.length, limit, offset, hasMore: offset + limit < memberships.length }
})
const userClient = { listRings, getMyMemberships, getUserDID: jest.fn(async () => 'did:key:me') }

beforeEach(() => {
  jest.clearAllMocks()
  clearCache()
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(userClient)
  ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ listRings })
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'me' })
  ;(db.userBlock.findMany as jest.Mock).mockResolvedValue([])
})

describe('GET /api/threadrings', () => {
  test('My rings pages past 20 with the hub total', async () => {
    const first = await call(listHandler, { membership: 'true' })
    expect(listRings).toHaveBeenLastCalledWith(expect.objectContaining({ memberDid: 'did:key:me' }))
    expect(first.body).toMatchObject({ total: 25, hasMore: true, nextOffset: 20 })
    expect(first.body.threadRings).toHaveLength(20)

    const second = await call(listHandler, { membership: 'true', offset: '20' })
    expect(second.body).toMatchObject({ total: 25, hasMore: false, nextOffset: 25 })
    expect(second.body.threadRings.map((r: any) => r.slug)).toEqual(['ring-20', 'ring-21', 'ring-22', 'ring-23', 'ring-24'])
  })

  test('All rings keeps the rings you are in, with your role', async () => {
    const res = await call(listHandler, {})
    expect(res.body.threadRings).toHaveLength(20)
    expect(res.body.threadRings[0].viewerMembership).toMatchObject({ role: 'member' })
    expect(res.body.total).toBe(25)
    expect(listRings).toHaveBeenLastCalledWith(expect.not.objectContaining({ memberDid: expect.anything() }))
  })

  test('signed out, My rings is empty and the hub is not asked', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const res = await call(listHandler, { membership: 'true' })
    expect(res.body).toEqual({ threadRings: [], hasMore: false, total: 0, nextOffset: 0 })
    expect(listRings).not.toHaveBeenCalled()
  })

  test.each([
    ['newest', { sort: 'created', order: 'desc' }],
    ['members', { sort: 'members', order: 'desc' }],
    ['alphabetical', { sort: 'name', order: 'asc' }],
    // gone from the page; old links get Newest
    ['posts', { sort: 'created', order: 'desc' }],
    ['trending', { sort: 'created', order: 'desc' }],
  ])('sort=%s asks the hub for a sort it has', async (sort, expected) => {
    await call(listHandler, { sort })
    expect(listRings).toHaveBeenLastCalledWith(expect.objectContaining(expected))
  })

  test('a search sends no sort, so the best matches come first', async () => {
    await call(listHandler, { search: 'knit', sort: 'members' })
    const options = listRings.mock.calls[0][0]
    expect(options.search).toBe('knit')
    expect(options.sort).toBeUndefined()
  })

  test('rings the viewer blocked are left out, and paging still follows the hub', async () => {
    ;(db.userBlock.findMany as jest.Mock).mockResolvedValue([{ blockedThreadRing: { slug: 'ring-01' } }])
    const res = await call(listHandler, {})
    expect(res.body.threadRings.map((r: any) => r.slug)).not.toContain('ring-01')
    expect(res.body.threadRings).toHaveLength(19)
    expect(res.body.nextOffset).toBe(20)
  })

  test('never asks for memberships separately, so it never writes the my-memberships cache', async () => {
    listRings.mockResolvedValueOnce({ rings: [ring('not-joined')], total: 1 })
    const res = await call(listHandler, {})
    expect(res.body.threadRings[0].viewerMembership).toBeNull()
    expect(getMyMemberships).not.toHaveBeenCalled()

    // …so the composer's list is still an array afterwards
    const mine = await call(myMembershipsHandler, {})
    expect(Array.isArray(mine.body.rings)).toBe(true)
  })
})

describe('GET /api/threadrings/my-memberships', () => {
  test('every ring, past the first page, A to Z, with the hub role', async () => {
    const res = await call(myMembershipsHandler, {})
    expect(res.body.rings).toHaveLength(25)
    expect(res.body.rings[0]).toMatchObject({ slug: 'ring-00', name: 'RING-00', role: 'owner' })
    expect(res.body.rings[24].slug).toBe('ring-24')
  })
})

describe('GET /api/threadrings/check-availability/[slug]', () => {
  const ORIGINAL_URL = process.env.RING_HUB_URL
  const ORIGINAL_FETCH = global.fetch
  const fetchMock = jest.fn()
  beforeAll(() => {
    process.env.RING_HUB_URL = 'https://hub.example/'
    global.fetch = fetchMock as any
  })
  afterAll(() => {
    process.env.RING_HUB_URL = ORIGINAL_URL
    global.fetch = ORIGINAL_FETCH
  })

  test("asks the hub's own check, which sees private rings too", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ available: false, slug: 'secret-club' }) })
    const res = await call(availabilityHandler, { slug: 'secret-club' })
    expect(fetchMock).toHaveBeenCalledWith('https://hub.example/trp/rings/check-availability/secret-club', expect.anything())
    expect(res.body).toMatchObject({ available: false, slug: 'secret-club' })
  })

  test('a free slug is available', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ available: true, slug: 'new-club' }) })
    expect((await call(availabilityHandler, { slug: 'new-club' })).body.available).toBe(true)
  })

  test('a hub failure is an error, not "available"', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue({ ok: false, status: 502 })
    const res = await call(availabilityHandler, { slug: 'new-club' })
    expect(res.statusCode).toBe(500)
    expect(res.body.available).toBeUndefined()
  })
})
