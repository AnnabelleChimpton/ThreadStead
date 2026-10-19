/**
 * Route tests (mocked hub) for two routes that read a hub ring's members. The
 * hub lists them newest first, 20 by default, so one unparameterised read
 * missed everyone older:
 *  - POST /api/threadrings/[slug]/invite: the curator (usually the oldest
 *    member) got a 403 in any ring over 20. It also matched the viewer by
 *    User.did instead of their federation DID, and signed the invite as the
 *    server, which the hub rejects.
 *  - GET /api/threadrings/[slug]/members: the ring page reads the viewer's own
 *    role from this list, so older members showed as non-members.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userDID: { findUnique: jest.fn() },
    handle: { findFirst: jest.fn() },
    threadRing: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ withCsrfProtection: (h: any) => h }))
jest.mock('@/lib/server/http/rate-limit', () => ({ withRateLimit: () => (h: any) => h }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  getRingHubClient: jest.fn(),
  getPublicRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-transformers', () => ({
  transformRingMembersBatchWithUserResolution: jest.fn(async (members: any[]) =>
    members.map((m) => ({
      id: m.actorDid, userId: m.actorDid, role: m.role, joinedAt: m.joinedAt,
      user: { id: m.actorDid, handles: [], displayName: m.actorDid, avatarUrl: null },
    }))
  ),
}))

import inviteHandler from '@/pages/api/threadrings/[slug]/invite'
import membersHandler from '@/pages/api/threadrings/[slug]/members'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getRingHubClient, RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { MEMBER_PAGE_SIZE } from '@/lib/api/ringhub/ring-members'

const mockDb = db as any

const VIEWER = { id: 'curator-1', did: 'did:key:z-curator-login' }
const VIEWER_HUB_DID = 'did:web:homepageagain.com:users:curator'
const INVITEE_HUB_DID = 'did:web:homepageagain.com:users:pat'

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

/**
 * A hub ring of `count` members paged like hub rings.ts: newest first, 20 by
 * default. The oldest (last) member is `oldest`, with `oldestRole`.
 */
function hubRing(count: number, oldest: string, oldestRole: 'owner' | 'moderator' | 'member') {
  const all = Array.from({ length: count }, (_, i) => ({
    actorDid: i === count - 1 ? oldest : `did:web:elsewhere.example:m${i}`,
    status: 'ACTIVE',
    role: i === count - 1 ? oldestRole : 'member',
    joinedAt: new Date(Date.UTC(2026, 0, 1) - i * 60_000).toISOString(),
  }))
  return {
    getRingMembers: jest.fn(async (_slug: string, opts?: { limit?: number; offset?: number }) => {
      const limit = opts?.limit ?? 20
      const offset = opts?.offset ?? 0
      const members = all.slice(offset, offset + limit)
      return { members, total: count, limit, offset, hasMore: offset + members.length < count }
    }),
    inviteMember: jest.fn().mockResolvedValue({ success: true, invitation: { id: 'inv-1' } }),
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
  ;(getSessionUser as jest.Mock).mockResolvedValue(VIEWER)
})

describe('POST /api/threadrings/[slug]/invite', () => {
  beforeEach(() => {
    ;(getRingHubClient as jest.Mock).mockReturnValue({
      getRing: jest.fn().mockResolvedValue({ slug: 'big-ring' }),
    })
    mockDb.userDID.findUnique.mockResolvedValue({ did: VIEWER_HUB_DID })
    mockDb.handle.findFirst.mockResolvedValue({
      handle: 'pat', user: { did: 'did:key:z-pat-login', userDID: { did: INVITEE_HUB_DID } },
    })
  })

  test('the curator of a 130-member ring, the oldest member, can invite', async () => {
    const hub = hubRing(130, VIEWER_HUB_DID, 'owner')
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)

    const { req, res } = makeReqRes('POST', { slug: 'big-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(hub.getRingMembers.mock.calls).toEqual([
      ['big-ring', { limit: MEMBER_PAGE_SIZE, offset: 0 }],
      ['big-ring', { limit: MEMBER_PAGE_SIZE, offset: MEMBER_PAGE_SIZE }],
    ])
    // Signed as the curator, to the invitee's federation DID
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith(VIEWER.id)
    expect(hub.inviteMember).toHaveBeenCalledWith('big-ring', INVITEE_HUB_DID)
  })

  test('a plain member gets a 403 and nothing reaches the hub', async () => {
    const hub = hubRing(130, VIEWER_HUB_DID, 'member')
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)

    const { req, res } = makeReqRes('POST', { slug: 'big-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(403)
    expect(hub.inviteMember).not.toHaveBeenCalled()
  })

  test('the viewer is matched by their federation DID, not User.did', async () => {
    const hub = hubRing(3, VIEWER.did, 'owner')
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)

    const { req, res } = makeReqRes('POST', { slug: 'big-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(403)
  })

  test("a hub rejection is reported with the hub's status — no local fallback", async () => {
    const hub = hubRing(5, VIEWER_HUB_DID, 'moderator')
    hub.inviteMember.mockRejectedValue(
      new RingHubClientError('Invitation exists', 400, undefined, {
        message: 'User already has a pending invitation to this ring',
      })
    )
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)

    const { req, res } = makeReqRes('POST', { slug: 'big-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.error).toBe('User already has a pending invitation to this ring')
    expect(mockDb.threadRing.findUnique).not.toHaveBeenCalled()
  })

  test("a members read that fails is a degraded 503, not a 403", async () => {
    const hub = hubRing(5, VIEWER_HUB_DID, 'owner')
    hub.getRingMembers.mockRejectedValue(new Error('socket hang up'))
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)

    const { req, res } = makeReqRes('POST', { slug: 'big-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(503)
    expect(res.jsonBody.degraded).toBe(true)
    expect(hub.inviteMember).not.toHaveBeenCalled()
  })
})

describe('GET /api/threadrings/[slug]/members (signed in)', () => {
  test('returns every member of a 130-member ring, oldest included', async () => {
    const hub = hubRing(130, VIEWER_HUB_DID, 'owner')
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)

    const { req, res } = makeReqRes('GET', { slug: 'members-big-ring' })
    await membersHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody.members).toHaveLength(130)
    expect(res.jsonBody.members.at(-1)).toMatchObject({ userId: VIEWER_HUB_DID, role: 'owner' })
    expect(res.jsonBody).toMatchObject({ total: 130, offset: 0, hasMore: false })
  })

  test('a hub that fails with nothing cached is a degraded 503', async () => {
    const hub = hubRing(5, VIEWER_HUB_DID, 'owner')
    hub.getRingMembers.mockRejectedValue(new Error('socket hang up'))
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)

    const { req, res } = makeReqRes('GET', { slug: 'members-hub-down' })
    await membersHandler(req, res)

    expect(res.statusCode).toBe(503)
    expect(res.jsonBody.degraded).toBe(true)
  })
})
