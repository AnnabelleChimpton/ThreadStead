/**
 * Route tests (mocked hub clients) for two ThreadStead↔RingHub fixes:
 *  - GET /api/threadrings: anonymous viewers use the UNSIGNED public client
 *    (the 2026-10-17 outage: instance-key failures 503'd the whole directory),
 *    and signed results are cached per viewer (one viewer's membership used to
 *    be served to everyone with the same query).
 *  - PUT/DELETE /api/threadrings/[slug]/members/[userId] (audit 0.8): signed
 *    as the ring OWNER with the target's federation DID, and a hub failure is
 *    reported instead of falling through to a local-only write.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    ringHubOwnership: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    userDID: { findUnique: jest.fn() },
    threadRing: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({
  withThreadRingSupport: (handler: any) => (req: any, res: any) => handler(req, res, 'ringhub'),
}))
jest.mock('@/lib/server/http/csrf', () => ({ withCsrfProtection: (h: any) => h }))
jest.mock('@/lib/server/http/rate-limit', () => ({ withRateLimit: () => (h: any) => h }))
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

const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_USE_RING_HUB
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_RING_HUB = 'true'
})
afterAll(() => {
  process.env.NEXT_PUBLIC_USE_RING_HUB = ORIGINAL_FLAG
})
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
    const a = makeReqRes('GET', { search: 'shared', membership: 'true' })
    await listHandler(a.req, a.res)
    expect(a.res.jsonBody.threadRings[0].viewerMembership).toMatchObject({ role: 'member' })

    // …and an anonymous visitor with the same query must not get A's membership.
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const anon = makeReqRes('GET', { search: 'shared', membership: 'true' })
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
  let ownerOps: { updateMemberRole: jest.Mock; removeMember: jest.Mock }

  beforeEach(() => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'owner-1' })
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({
      getRing: jest.fn().mockResolvedValue(ring('my-ring')),
    })
    mockDb.ringHubOwnership.findUnique.mockResolvedValue({ ringSlug: 'my-ring', ownerUserId: 'owner-1' })
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-2', did: 'did:key:z-legacy', handles: [{ host: 'x', handle: 'pat' }],
    })
    mockDb.userDID.findUnique.mockResolvedValue({ did: 'did:web:homepageagain.com:users:abc' })
    ownerOps = {
      updateMemberRole: jest.fn().mockResolvedValue({ message: 'ok', member: { role: 'moderator' } }),
      removeMember: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    }
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(ownerOps)
  })

  test("promotes as the ring owner, targeting the member's federation DID", async () => {
    const { req, res } = makeReqRes('PUT', { slug: 'my-ring', userId: 'user-2' }, { role: 'moderator' })
    await memberHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('owner-1')
    expect(ownerOps.updateMemberRole).toHaveBeenCalledWith(
      'my-ring', 'did:web:homepageagain.com:users:abc', 'moderator'
    )
  })

  test('removes as the ring owner', async () => {
    const { req, res } = makeReqRes('DELETE', { slug: 'my-ring', userId: 'user-2' })
    await memberHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(ownerOps.removeMember).toHaveBeenCalledWith('my-ring', 'did:web:homepageagain.com:users:abc')
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
})
