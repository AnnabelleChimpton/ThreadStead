/**
 * Route tests (mocked hub) for how someone invited to a hub ring finds out
 * and accepts. The hub has no way to list a person's invitations, so:
 *  - POST /api/threadrings/[slug]/invite sends the invitee a
 *    `threadring_invite` notification once the hub has made the invitation.
 *  - GET /api/threadrings/[slug]/my-invite reads that notification, so the
 *    ring page knows to show an Accept button.
 *  - Accepting is POST /api/threadrings/[slug]/join: the hub's /join uses up
 *    the invitation, and its refusals come back readable.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userDID: { findUnique: jest.fn() },
    handle: { findFirst: jest.fn() },
    threadRing: { findUnique: jest.fn().mockResolvedValue(null) },
    notification: { create: jest.fn(), findFirst: jest.fn() },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
// No one hidden (visibleNotificationsWhere)
jest.mock('@/lib/domain/users/blocks', () => ({ getHiddenIds: async () => ({ blockedUserIds: [], blockedThreadRingIds: [] }) }))
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
  getRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
  AuthenticatedRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({
  withThreadRingSupport: (h: any) => (req: any, res: any) => h(req, res, 'ringhub'),
}))
jest.mock('@/lib/api/ringhub/ringhub-retry', () => ({
  retryWithBackoff: (fn: () => Promise<unknown>) => fn(),
}))

import inviteHandler from '@/pages/api/threadrings/[slug]/invite'
import myInviteHandler from '@/pages/api/threadrings/[slug]/my-invite'
import joinHandler from '@/pages/api/threadrings/[slug]/join'
import leaveHandler from '@/pages/api/threadrings/[slug]/leave'
import { cached, clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getRingHubClient, RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import {
  AuthenticatedRingHubClient,
  createAuthenticatedRingHubClient,
} from '@/lib/api/ringhub/ringhub-user-operations'

const mockDb = db as any

const VIEWER = { id: 'curator-1', did: 'did:key:z-curator-login' }
const VIEWER_HUB_DID = 'did:web:homepageagain.com:users:curator'
const INVITEE = { id: 'pat-1', did: 'did:key:z-pat-login', userDID: { did: 'did:web:homepageagain.com:users:pat' } }
const EXPIRES = '2026-10-26T12:00:00.000Z'

function makeReqRes(method: string, query: Record<string, string>, body?: any) {
  const req = { method, query, body, headers: {}, url: '/api/test' } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
    headersSent: false,
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

function curatorHub() {
  return {
    // The ring as its Host reads it
    getRingAsMember: jest.fn().mockResolvedValue({ slug: 'tea-ring', name: 'Tea Ring', ownerDid: VIEWER_HUB_DID }),
    getRingMembers: jest.fn().mockResolvedValue({
      members: [{ actorDid: VIEWER_HUB_DID, status: 'ACTIVE', role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z' }],
      total: 1, limit: 100, offset: 0, hasMore: false,
    }),
    // What hub ring-management.ts reply.send()s
    inviteMember: jest.fn().mockResolvedValue({
      success: true,
      invitation: {
        id: 'inv-1', ringSlug: 'tea-ring', inviteeDid: INVITEE.userDID.did, inviterDid: VIEWER_HUB_DID,
        status: 'PENDING', createdAt: '2026-10-19T12:00:00.000Z', expiresAt: EXPIRES,
      },
    }),
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
  jest.spyOn(console, 'log').mockImplementation(() => {})
  ;(getSessionUser as jest.Mock).mockResolvedValue(VIEWER)
})

describe('POST /api/threadrings/[slug]/invite tells the invitee', () => {
  let hub: ReturnType<typeof curatorHub>
  beforeEach(() => {
    hub = curatorHub()
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)
    ;(getRingHubClient as jest.Mock).mockReturnValue({
      getRing: jest.fn().mockResolvedValue({ slug: 'tea-ring', name: 'Tea Ring' }),
    })
    mockDb.userDID.findUnique.mockResolvedValue({ did: VIEWER_HUB_DID })
    mockDb.handle.findFirst.mockResolvedValue({ handle: 'pat', user: INVITEE })
  })

  test('a hub invite sends a notification with the ring and the hub expiry', async () => {
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mockDb.notification.create).toHaveBeenCalledWith({
      data: {
        recipientId: INVITEE.id,
        actorId: VIEWER.id,
        type: 'threadring_invite',
        data: {
          source: 'ringhub',
          threadRingSlug: 'tea-ring',
          threadRingName: 'Tea Ring',
          invitationId: 'inv-1',
          expiresAt: EXPIRES,
        },
      },
    })
  })

  test('a hub refusal sends no notification', async () => {
    hub.inviteMember.mockRejectedValue(
      new RingHubClientError('Already a member', 400, undefined, { message: 'User is already a member of this ring' })
    )
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(400)
    expect(mockDb.notification.create).not.toHaveBeenCalled()
  })

  test('a failed notification still reports the invite as sent', async () => {
    mockDb.notification.create.mockRejectedValue(new Error('db down'))
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' }, { username: 'pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody.success).toBe(true)
  })

  test('the invitee lookup leaves out blocks either way and restricted accounts', async () => {
    mockDb.handle.findFirst.mockResolvedValue(null)
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' }, { username: '@Pat' })
    await inviteHandler(req, res)

    expect(res.statusCode).toBe(404)
    expect(hub.inviteMember).not.toHaveBeenCalled()
    const where = mockDb.handle.findFirst.mock.calls[0][0].where
    expect(where.handle).toBe('pat')
    expect(where.user.AND).toEqual(
      expect.arrayContaining([
        { blocksCreated: { none: { blockedUserId: VIEWER.id } } },
        { blocksReceived: { none: { blockerId: VIEWER.id } } },
      ])
    )
  })
})

describe('GET /api/threadrings/[slug]/my-invite', () => {
  const inviter = { primaryHandle: 'curator@HomePageAgain', profile: { displayName: 'Cora' } }

  test('an open hub invite comes back with who sent it', async () => {
    mockDb.notification.findFirst.mockResolvedValue({
      data: { source: 'ringhub', threadRingSlug: 'tea-ring', expiresAt: '2999-01-01T00:00:00.000Z' },
      actor: inviter,
    })
    const { req, res } = makeReqRes('GET', { slug: 'tea-ring' })
    await myInviteHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toEqual({
      invite: {
        expiresAt: '2999-01-01T00:00:00.000Z',
        inviter: { handle: 'curator@HomePageAgain', displayName: 'Cora' },
      },
    })
    expect(mockDb.notification.findFirst.mock.calls[0][0].where).toEqual({
      recipientId: VIEWER.id,
      type: 'threadring_invite',
      data: { path: ['threadRingSlug'], equals: 'tea-ring' },
    })
  })

  test.each([
    ['expired', { source: 'ringhub', threadRingSlug: 'tea-ring', expiresAt: '2020-01-01T00:00:00.000Z' }],
    ['a local-ring invite', { threadRingSlug: 'tea-ring', inviteId: 'local-1' }],
  ])('%s is no invite', async (_label, data) => {
    mockDb.notification.findFirst.mockResolvedValue({ data, actor: inviter })
    const { req, res } = makeReqRes('GET', { slug: 'tea-ring' })
    await myInviteHandler(req, res)

    expect(res.jsonBody).toEqual({ invite: null })
  })

  test('signed out is a 401', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes('GET', { slug: 'tea-ring' })
    await myInviteHandler(req, res)

    expect(res.statusCode).toBe(401)
    expect(mockDb.notification.findFirst).not.toHaveBeenCalled()
  })
})

describe('POST /api/threadrings/[slug]/join on an invite-only hub ring', () => {
  function hubJoinFails(error: RingHubClientError) {
    ;(AuthenticatedRingHubClient as unknown as jest.Mock).mockImplementation(() => ({
      joinRing: jest.fn().mockRejectedValue(error),
    }))
  }

  test('no open invite: says so plainly', async () => {
    // membership.ts INVITATION branch
    hubJoinFails(new RingHubClientError('Invitation required', 403, undefined, {
      error: 'Invitation required', message: 'This ring requires an invitation to join',
    }))
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' })
    await joinHandler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res.jsonBody.error).toMatch(/needs an invite/)
  })

  test("already a member is the hub's 409, not a 500", async () => {
    hubJoinFails(new RingHubClientError('Already member', 409, undefined, {
      error: 'Already member', message: 'You are already a member of this ring',
    }))
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' })
    await joinHandler(req, res)

    expect(res.statusCode).toBe(409)
    expect(res.jsonBody.error).toBe('You are already a member of this ring')
  })

  test('an accepted invite joins', async () => {
    ;(AuthenticatedRingHubClient as unknown as jest.Mock).mockImplementation(() => ({
      joinRing: jest.fn().mockResolvedValue({
        membership: { id: 'm1', status: 'ACTIVE', role: 'member', requiresApproval: false },
        badge: { id: 'b1', url: 'https://hub/badges/b1' },
        message: 'Successfully joined ring',
      }),
    }))
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' })
    await joinHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toMatchObject({ success: true, badgeId: 'b1' })
  })
})

describe('joining, accepting and leaving forget the cached reads', () => {
  const kept = async (key: string) => {
    const read = jest.fn().mockResolvedValue('fresh')
    return { value: await cached(key, 60_000, 60_000, read), read }
  }

  beforeEach(async () => {
    clearCache()
    ;(getSessionUser as jest.Mock).mockResolvedValue(VIEWER)
    await cached(`ring-members-all:${VIEWER.id}:tea-ring`, 60_000, 60_000, async () => 'before')
    await cached(`my-memberships:${VIEWER.id}`, 60_000, 60_000, async () => 'before')
  })

  test('after a join, the next read asks the hub again, and the role comes back', async () => {
    ;(AuthenticatedRingHubClient as unknown as jest.Mock).mockImplementation(() => ({
      joinRing: jest.fn().mockResolvedValue({ membership: { role: 'member' }, badge: null }),
    }))
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' })
    await joinHandler(req, res)

    expect(res.jsonBody).toMatchObject({ success: true, role: 'member' })
    expect((await kept(`ring-members-all:${VIEWER.id}:tea-ring`)).value).toBe('fresh')
    expect((await kept(`my-memberships:${VIEWER.id}`)).value).toBe('fresh')
  })

  test('a refused join keeps them', async () => {
    ;(AuthenticatedRingHubClient as unknown as jest.Mock).mockImplementation(() => ({
      joinRing: jest.fn().mockRejectedValue(new RingHubClientError('Closed', 403, undefined, { message: 'Closed' })),
    }))
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' })
    await joinHandler(req, res)

    expect(res.statusCode).toBe(403)
    expect((await kept(`ring-members-all:${VIEWER.id}:tea-ring`)).value).toBe('before')
  })

  test('after leaving, the next read asks the hub again', async () => {
    ;(AuthenticatedRingHubClient as unknown as jest.Mock).mockImplementation(() => ({
      leaveRing: jest.fn().mockResolvedValue(undefined),
    }))
    const { req, res } = makeReqRes('POST', { slug: 'tea-ring' })
    await leaveHandler(req, res)

    expect(res.jsonBody).toMatchObject({ success: true, role: null })
    expect((await kept(`ring-members-all:${VIEWER.id}:tea-ring`)).value).toBe('fresh')
    expect((await kept(`my-memberships:${VIEWER.id}`)).value).toBe('fresh')
  })
})
