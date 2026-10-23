/**
 * PUT/DELETE /api/threadrings/[slug]/settings with a mocked hub:
 *  - the ring is read and changed signed as its Host (a private ring is
 *    invisible to this site's key), with rights from the hub's ownerDid, not
 *    the local owner row;
 *  - only the fields sent go to the hub, and an emptied one is sent as null
 *    so the hub clears it;
 *  - Application joining and curated posting aren't accepted any more;
 *  - deleting is for a Host alone in their ring.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userDID: { findUnique: jest.fn() },
    ringHubOwnership: { findUnique: jest.fn() },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  getRingHubClient: jest.fn(),
  getPublicRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))
jest.mock('@/lib/domain/users/account-removal', () => ({ forgetRing: jest.fn() }))
jest.mock('@/lib/api/ringhub/forget-ring-reads', () => ({ forgetRingReads: jest.fn() }))

import handler from '@/pages/api/threadrings/[slug]/settings'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { forgetRing } from '@/lib/domain/users/account-removal'
import { forgetRingReads } from '@/lib/api/ringhub/forget-ring-reads'

const mockDb = db as any
const HOST_DID = 'did:web:homepageagain.com:users:host'

function ring(extra: Record<string, unknown> = {}) {
  return {
    id: 'r1', slug: 'knits', name: 'Knits', description: 'Socks and more', shortCode: null,
    visibility: 'PRIVATE', joinPolicy: 'APPLICATION', postPolicy: 'CURATED', ownerDid: HOST_DID,
    curatorNote: 'Be kind', bannerUrl: 'https://example.com/b.png', themeColor: '#2e4b3f',
    memberCount: 3, postCount: 0, ...extra,
  }
}

let member: Record<string, jest.Mock>

async function call(method: string, body?: unknown) {
  const req = { method, query: { slug: 'knits' }, body, headers: {}, url: '/api/threadrings/knits/settings' } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    headersSent: false,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; return this },
    setHeader: jest.fn(),
  }
  await handler(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'host-1', role: 'member' })
  mockDb.userDID.findUnique.mockImplementation(async ({ where }: any) =>
    where.userId === 'host-1' ? { did: HOST_DID } : where.userId === 'mod-1' ? { did: 'did:web:homepageagain.com:users:mod' } : null
  )
  // The local mirror says someone else owns it: the hub's word wins
  mockDb.ringHubOwnership.findUnique.mockResolvedValue({ ownerUserId: 'old-owner' })
  member = {
    getRingAsMember: jest.fn().mockResolvedValue(ring()),
    getRingMembers: jest.fn().mockResolvedValue({ members: [], total: 0, limit: 100, offset: 0, hasMore: false }),
    updateRing: jest.fn(async (_slug: string, updates: Record<string, unknown>) => ring(updates)),
    deleteRing: jest.fn().mockResolvedValue(undefined),
  }
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(member)
})

describe('PUT', () => {
  test('the Host saves only what changed, signed as themselves; emptied fields go as null', async () => {
    const res = await call('PUT', { name: ' Knitters ', description: '', bannerUrl: '  ', curatorNote: '   ' })

    expect(res.statusCode).toBe(200)
    expect(member.updateRing).toHaveBeenCalledWith('knits', {
      name: 'Knitters', description: null, bannerUrl: null, curatorNote: null,
    })
    expect(forgetRingReads).toHaveBeenCalledWith('knits')
  })

  test('application and curated rings show as invite-only and members-only', async () => {
    const res = await call('PUT', { name: 'Knits' })
    expect(res.body.settings).toMatchObject({ joinType: 'invite', postPolicy: 'members', visibility: 'private' })
  })

  test.each([
    [{ joinType: 'application' }],
    [{ postPolicy: 'curated' }],
    [{ postPolicy: 'open' }],
    [{ themeColor: 'red; background: url(x)' }],
    [{ bannerUrl: 'javascript:alert(1)' }],
  ])('refuses %j before the hub is asked', async (body) => {
    const res = await call('PUT', body)
    expect(res.statusCode).toBe(400)
    expect(member.updateRing).not.toHaveBeenCalled()
  })

  test('maps the choices to the hub', async () => {
    await call('PUT', { joinType: 'invite', visibility: 'unlisted', postPolicy: 'closed', themeColor: '#5A4FB3' })
    expect(member.updateRing).toHaveBeenCalledWith('knits', {
      joinPolicy: 'INVITATION', visibility: 'UNLISTED', postPolicy: 'CLOSED', themeColor: '#5a4fb3',
    })
  })

  test("a moderator can't change settings", async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'mod-1', role: 'member' })
    const res = await call('PUT', { name: 'Mine now' })
    expect(res.statusCode).toBe(403)
    expect(member.updateRing).not.toHaveBeenCalled()
  })

  test('a site admin signs as this site, which the hub treats as its admin', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'mod-1', role: 'admin' })
    const site = { updateRing: jest.fn(async () => ring({ name: 'Fixed' })) }
    ;(getRingHubClient as jest.Mock).mockReturnValue(site)
    const res = await call('PUT', { name: 'Fixed' })
    expect(res.statusCode).toBe(200)
    expect(site.updateRing).toHaveBeenCalledWith('knits', { name: 'Fixed' })
    expect(member.updateRing).not.toHaveBeenCalled()
  })

  test("a ring the hub can't be asked about is a 503, and nothing is saved", async () => {
    member.getRingAsMember.mockRejectedValue(new Error('socket hang up'))
    const res = await call('PUT', { name: 'Knits' })
    expect(res.statusCode).toBe(503)
    expect(member.updateRing).not.toHaveBeenCalled()
  })
})

describe('DELETE', () => {
  test('a Host alone in the ring deletes it, and it is forgotten here', async () => {
    member.getRingAsMember.mockResolvedValue(ring({ memberCount: 1 }))
    const res = await call('DELETE')
    expect(res.statusCode).toBe(200)
    expect(member.deleteRing).toHaveBeenCalledWith('knits')
    expect(forgetRing).toHaveBeenCalledWith('knits')
    expect(forgetRingReads).toHaveBeenCalledWith('knits', ['host-1'])
  })

  test('with others in it, hand it over first', async () => {
    const res = await call('DELETE')
    expect(res.statusCode).toBe(409)
    expect(res.body.error).toMatch(/Hand it to one of them/)
    expect(member.deleteRing).not.toHaveBeenCalled()
  })

  test('someone who joined since the page loaded keeps it', async () => {
    member.getRingAsMember
      .mockResolvedValueOnce(ring({ memberCount: 1, visibility: 'PUBLIC' }))
      .mockResolvedValueOnce(ring({ memberCount: 2, visibility: 'PUBLIC' }))
    const res = await call('DELETE')
    expect(res.statusCode).toBe(409)
    expect(member.deleteRing).not.toHaveBeenCalled()
  })

  test('only the Host deletes', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'mod-1', role: 'admin' })
    member.getRingAsMember.mockResolvedValue(ring({ memberCount: 1 }))
    const res = await call('DELETE')
    expect(res.statusCode).toBe(403)
    expect(member.deleteRing).not.toHaveBeenCalled()
  })
})
