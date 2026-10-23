/**
 * Route tests (mocked hub clients) for two ThreadStead↔RingHub fixes:
 *  - GET /api/threadrings: anonymous viewers use the UNSIGNED public client
 *    (the 2026-10-17 outage: instance-key failures 503'd the whole directory),
 *    and signed results are cached per viewer (one viewer's membership used to
 *    be served to everyone with the same query).
 *  - PUT/DELETE /api/threadrings/[slug]/members/[userId] (audit 0.8): the
 *    ring read and the change signed as the viewer, rights from the hub (not
 *    the local owner row), the target's federation DID (or an outsider's own
 *    DID), and a hub failure reported instead of a local-only write.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    ringHubOwnership: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    userDID: { findUnique: jest.fn() },
    threadRing: { findUnique: jest.fn().mockResolvedValue(null) },
    userBlock: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({
  csrfProtection: jest.fn().mockResolvedValue(true),
  withCsrfProtection: (h: any) => h,
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  rateLimitCheck: jest.fn().mockResolvedValue(true),
  withRateLimit: () => (h: any) => h,
}))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  getPublicRingHubClient: jest.fn(),
  getRingHubClient: jest.fn(() => {
    throw new Error('server-signed client must not be used here')
  }),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))

import listHandler from '@/pages/api/threadrings/index'
import memberHandler from '@/pages/api/threadrings/[slug]/members/[userId]'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient, RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { RingHubAuthError } from '@/lib/api/ringhub/ringhub-errors'

const mockDb = db as any

function makeReqRes(method: string, query: Record<string, string>, body?: any) {
  const req = { method, query, body, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.jsonBody = payload
      return this
    },
    setHeader: jest.fn(),
  }
  return { req, res: res as NextApiResponse & { statusCode: number; jsonBody: any } }
}

function ring(slug: string, extra: Record<string, unknown> = {}) {
  return {
    id: `id-${slug}`, slug, name: slug, visibility: 'PUBLIC', joinPolicy: 'OPEN',
    memberCount: 1, postCount: 0, createdAt: '2026-01-01T00:00:00Z', ...extra,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/threadrings', () => {
  test('anonymous viewers are served by the unsigned public client', async () => {
    const listRings = jest.fn().mockResolvedValue({ rings: [ring('open-ring')], total: 1 })
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ listRings })
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)

    const { req, res } = makeReqRes('GET', { search: 'anon-only' })
    await listHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(listRings).toHaveBeenCalledTimes(1)
    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalled()
    expect(res.jsonBody.threadRings[0].slug).toBe('open-ring')
  })

  test("one viewer's membership is never served to another viewer or to anonymous", async () => {
    const signedRing = ring('shared-ring', {
      currentUserMembership: { status: 'ACTIVE', role: 'MEMBER', joinedAt: '2026-01-01T00:00:00Z' },
    })
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue({
      listRings: jest.fn().mockResolvedValue({ rings: [signedRing], total: 1 }),
    })
    const publicListRings = jest.fn().mockResolvedValue({ rings: [ring('shared-ring')], total: 1 })
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ listRings: publicListRings })

    // Viewer A (a member) fills the cache for this query…
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'viewer-a' })
    const a = makeReqRes('GET', { search: 'shared' })
    await listHandler(a.req, a.res)
    expect(a.res.jsonBody.threadRings[0].viewerMembership).toMatchObject({ role: 'member' })

    // …and an anonymous visitor with the same listing must not get A's membership.
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const anon = makeReqRes('GET', { search: 'shared' })
    await listHandler(anon.req, anon.res)
    expect(publicListRings).toHaveBeenCalledTimes(1)
    expect(anon.res.jsonBody.threadRings[0].viewerMembership).toBeNull()
  })

  test('a hub auth failure still returns the degraded 503 signal', async () => {
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({
      listRings: jest.fn().mockRejectedValue(new RingHubAuthError('Unknown key')),
    })
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes('GET', { search: 'auth-fails' })
    await listHandler(req, res)
    expect(res.statusCode).toBe(503)
    expect(res.jsonBody).toMatchObject({ degraded: true })
  })
})

describe('PUT/DELETE /api/threadrings/[slug]/members/[userId]', () => {
  const OWNER_DID = 'did:web:homepageagain.com:users:owner'
  const MOD_DID = 'did:web:homepageagain.com:users:mod'
  const TARGET_DID = 'did:web:homepageagain.com:users:abc'
  let ownerOps: Record<string, jest.Mock>

  beforeEach(() => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'owner-1', role: 'member' })
    const keys: Record<string, string> = { 'owner-1': OWNER_DID, 'mod-1': MOD_DID, someone: 'did:web:homepageagain.com:users:someone' }
    mockDb.userDID.findUnique.mockImplementation(async ({ where }: any) =>
      where.userId && keys[where.userId] ? { did: keys[where.userId] } : null
    )
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-2', did: 'did:key:z-legacy', primaryHandle: 'pat@HomePageAgain', userDID: { did: TARGET_DID },
    })
    // Nothing here says who owns it: the hub does
    mockDb.ringHubOwnership.findUnique.mockResolvedValue(null)
    ownerOps = {
      getRingAsMember: jest.fn().mockResolvedValue(ring('my-ring', { ownerDid: OWNER_DID, visibility: 'PRIVATE' })),
      getRingMembers: jest.fn().mockResolvedValue({
        members: [{ actorDid: MOD_DID, status: 'ACTIVE', role: 'moderator', joinedAt: '2026-01-01T00:00:00Z' }],
        total: 1, limit: 100, offset: 0, hasMore: false,
      }),
      updateMemberRole: jest.fn().mockResolvedValue({ message: 'ok', member: { role: 'moderator' } }),
      removeMember: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    }
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(ownerOps)
  })

  test("promotes as the ring's Host, read and signed as them, targeting the member's federation DID", async () => {
    const { req, res } = makeReqRes('PUT', { slug: 'my-ring', userId: 'user-2' }, { role: 'moderator' })
    await memberHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('owner-1')
    // A private ring: read as its Host, never as this site
    expect(ownerOps.getRingAsMember).toHaveBeenCalledWith('my-ring')
    expect(ownerOps.updateMemberRole).toHaveBeenCalledWith('my-ring', TARGET_DID, 'moderator')
  })

  test('removes as the Host', async () => {
    const { req, res } = makeReqRes('DELETE', { slug: 'my-ring', userId: 'user-2' })
    await memberHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(ownerOps.removeMember).toHaveBeenCalledWith('my-ring', TARGET_DID)
  })

  test('a member from another instance is removed by their DID', async () => {
    const outsider = 'did:web:elsewhere.example:users:spam'
    const { req, res } = makeReqRes('DELETE', { slug: 'my-ring', userId: outsider })
    await memberHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(mockDb.user.findUnique).not.toHaveBeenCalled()
    expect(ownerOps.removeMember).toHaveBeenCalledWith('my-ring', outsider)
  })

  test('a moderator removes too: signed as them, the hub decides', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'mod-1', role: 'member' })
    const { req, res } = makeReqRes('DELETE', { slug: 'my-ring', userId: 'user-2' })
    await memberHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('mod-1')
    expect(ownerOps.removeMember).toHaveBeenCalledWith('my-ring', TARGET_DID)
  })

  test('only the Host changes roles, and plain members remove nobody', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'mod-1', role: 'member' })
    const put = makeReqRes('PUT', { slug: 'my-ring', userId: 'user-2' }, { role: 'moderator' })
    await memberHandler(put.req, put.res)
    expect(put.res.statusCode).toBe(403)

    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'someone', role: 'member' })
    const del = makeReqRes('DELETE', { slug: 'my-ring', userId: 'user-2' })
    await memberHandler(del.req, del.res)
    expect(del.res.statusCode).toBe(403)
    expect(ownerOps.updateMemberRole).not.toHaveBeenCalled()
    expect(ownerOps.removeMember).not.toHaveBeenCalled()
  })

  test('the Host themselves is never removed or re-roled here', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'owner-1', did: 'did:key:x', primaryHandle: null, userDID: { did: OWNER_DID } })
    const { req, res } = makeReqRes('DELETE', { slug: 'my-ring', userId: 'owner-1' })
    await memberHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(ownerOps.removeMember).not.toHaveBeenCalled()
  })

  test("a hub rejection is reported with the hub's status — no local fallback", async () => {
    ownerOps.updateMemberRole.mockRejectedValue(
      new RingHubClientError('Invalid role', 400, undefined, { message: 'Role not found in this ring' })
    )
    const { req, res } = makeReqRes('PUT', { slug: 'my-ring', userId: 'user-2' }, { role: 'moderator' })
    await memberHandler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.error).toBe('Role not found in this ring')
    expect(mockDb.threadRing.findUnique).not.toHaveBeenCalled()
  })

  test('a rejected owner key is a degraded 503, not a 401', async () => {
    ownerOps.removeMember.mockRejectedValue(new RingHubClientError('Authentication required', 401))
    const { req, res } = makeReqRes('DELETE', { slug: 'my-ring', userId: 'user-2' })
    await memberHandler(req, res)
    expect(res.statusCode).toBe(503)
    expect(res.jsonBody.degraded).toBe(true)
  })

  test('a ring the viewer can\'t see is a 404', async () => {
    ownerOps.getRingAsMember.mockResolvedValue(null)
    const { req, res } = makeReqRes('DELETE', { slug: 'my-ring', userId: 'user-2' })
    await memberHandler(req, res)
    expect(res.statusCode).toBe(404)
  })
})
