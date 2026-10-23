/**
 * The badge routes take their rights from the hub (ring-access.ts): the
 * ring's Host, or a site admin signing as this site. They used to trust the
 * local owner row, so a new Host after a hand-over was refused and the old
 * one got controls the hub then turned down.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: { userDID: { findUnique: jest.fn() }, ringHubOwnership: { findUnique: jest.fn() } },
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
jest.mock('@/lib/api/ringhub/forget-ring-reads', () => ({ forgetRingReads: jest.fn() }))
jest.mock('@/lib/badge-generator', () => ({ generateBadge: jest.fn(async () => ({ imageDataUrl: 'data:image/png;base64,x', title: 'Knits' })) }))
jest.mock('@/lib/badge-uploader', () => ({
  uploadBadgeImage: jest.fn(async () => ({ badgeImageUrl: 'https://cdn.test/b.png', badgeImageHighResUrl: 'https://cdn.test/b4.png' })),
}))

import updateBadge from '@/pages/api/threadrings/[slug]/update-badge'
import generateBadgeRoute from '@/pages/api/threadrings/[slug]/generate-and-upload-badge'
import badgeRoute from '@/pages/api/threadrings/[slug]/badge'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { forgetRingReads } from '@/lib/api/ringhub/forget-ring-reads'

const HOST_DID = 'did:web:homepageagain.com:users:host'
let member: Record<string, jest.Mock>

async function call(route: any, method: string, body?: unknown) {
  const req = { method, query: { slug: 'knits' }, body, headers: {}, url: '/api/x' } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; return this },
    setHeader: jest.fn(),
  }
  await route(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'host-1', role: 'member' })
  ;(db.userDID.findUnique as jest.Mock).mockImplementation(async ({ where }: any) =>
    where.userId === 'host-1' ? { did: HOST_DID } : { did: 'did:web:homepageagain.com:users:other' }
  )
  // The local owner row is stale: it names the Host before a hand-over
  ;(db.ringHubOwnership.findUnique as jest.Mock).mockResolvedValue({ ownerUserId: 'old-host' })
  member = {
    getRingAsMember: jest.fn().mockResolvedValue({
      slug: 'knits', name: 'Knits', ownerDid: HOST_DID, visibility: 'PRIVATE',
      badgeImageUrl: 'https://cdn.test/now.png', badgeImageHighResUrl: null,
    }),
    getRingMembers: jest.fn().mockResolvedValue({ members: [], total: 0, limit: 100, offset: 0, hasMore: false }),
    updateRingBadge: jest.fn().mockResolvedValue({ success: true, message: 'ok', badgesUpdated: 2 }),
  }
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(member)
})

test("the Host sets the badge image, signed as themselves, and nothing else goes", async () => {
  const res = await call(updateBadge, 'PUT', {
    badgeImageUrl: 'https://cdn.test/b.png', updateExistingBadges: true, description: 'dropped', criteria: 'dropped',
  })
  expect(res.statusCode).toBe(200)
  expect(member.updateRingBadge).toHaveBeenCalledWith('knits', { badgeImageUrl: 'https://cdn.test/b.png', updateExistingBadges: true })
  expect(res.body.badgesUpdated).toBe(2)
  expect(forgetRingReads).toHaveBeenCalledWith('knits')
})

test('anyone else is refused before the hub is asked, whatever the local owner row says', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'old-host', role: 'member' })
  expect((await call(updateBadge, 'PUT', { badgeImageUrl: 'https://cdn.test/b.png' })).statusCode).toBe(403)
  expect((await call(generateBadgeRoute, 'POST', { title: 'Knits' })).statusCode).toBe(403)
  expect(member.updateRingBadge).not.toHaveBeenCalled()
})

test('a site admin signs as this site', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'admin' })
  const site = { updateRingBadge: jest.fn().mockResolvedValue({ success: true, message: 'ok' }) }
  ;(getRingHubClient as jest.Mock).mockReturnValue(site)
  expect((await call(updateBadge, 'PUT', { badgeImageUrl: 'https://cdn.test/b.png' })).statusCode).toBe(200)
  expect(site.updateRingBadge).toHaveBeenCalled()
})

test('only https images', async () => {
  expect((await call(updateBadge, 'PUT', { badgeImageUrl: 'http://cdn.test/b.png' })).statusCode).toBe(400)
})

test("the manager reads the ring's real badge image", async () => {
  const res = await call(badgeRoute, 'GET')
  expect(res.body.badge).toEqual({ title: 'Knits', imageUrl: 'https://cdn.test/now.png', imageHighResUrl: null })
})
