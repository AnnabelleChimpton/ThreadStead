/**
 * @jest-environment node
 *
 * The badge routes take their rights from the hub (ring-access.ts): the
 * ring's Host, or a site admin signing as this site. They used to trust the
 * local owner row, so a new Host after a hand-over was refused and the old
 * one got controls the hub then turned down. Badges are drawn for real
 * (sharp), and only the upload is mocked.
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
jest.mock('@/lib/badge-uploader', () => ({
  ...jest.requireActual('@/lib/badge-uploader'),
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
import { uploadBadgeImage } from '@/lib/badge-uploader'
import sharp from 'sharp'

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
  expect((await call(generateBadgeRoute, 'POST', { template: 'label', text: 'Knits' })).statusCode).toBe(403)
  expect(uploadBadgeImage).not.toHaveBeenCalled()
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
  expect(res.body.badge).toEqual({ title: 'Knits', imageUrl: 'https://cdn.test/now.png', imageHighResUrl: null, choice: null })
})

describe('generate-and-upload-badge', () => {
  const pixels = (png: Buffer) => sharp(png).raw().toBuffer({ resolveWithObject: true })

  test("draws the picked badge in the ring's colour and uploads the 88×31 with its exact 4× HD", async () => {
    member.getRingAsMember.mockResolvedValue({ ...(await member.getRingAsMember()), themeColor: '#8C4A5B' })
    const res = await call(generateBadgeRoute, 'POST', { template: 'patch', glyph: 'cat', text: '  Knits & Purls  ' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ badgeImageUrl: 'https://cdn.test/b.png', badgeImageHighResUrl: 'https://cdn.test/b4.png' })
    const [images, slug, choice] = (uploadBadgeImage as jest.Mock).mock.calls[0]
    expect(slug).toBe('knits')
    expect(choice).toEqual({ template: 'patch', glyph: 'cat', text: 'Knits & Purls' })
    const small = await pixels(images.png)
    const big = await pixels(images.hd)
    expect([small.info.width, small.info.height, big.info.width, big.info.height]).toEqual([88, 31, 352, 124])
    // Patch's field, just inside its edge, is the rose palette's
    expect(Array.from(small.data.subarray((3 * 88 + 3) * 4, (3 * 88 + 3) * 4 + 3))).toEqual([0x8c, 0x4a, 0x5b])
  })

  test("with no words it says the ring's name, and a picture left out is no picture", async () => {
    expect((await call(generateBadgeRoute, 'POST', { template: 'stamp', glyph: null })).statusCode).toBe(200)
    expect((await call(generateBadgeRoute, 'POST', { template: 'stamp', text: 'Knits' })).statusCode).toBe(200)
    const [[first, , choice], [second]] = (uploadBadgeImage as jest.Mock).mock.calls
    expect(choice).toEqual({ template: 'stamp', glyph: null, text: '' })
    expect(first.png.equals(second.png)).toBe(true)
  })

  test('refuses the old body and unknown choices', async () => {
    for (const body of [
      { title: 'Knits', subtitle: 'yarn', backgroundColor: '#ff0000', textColor: '#ffffff' },
      { template: 'classic_blue', text: 'Knits' },
      { template: 'label', glyph: 'skull', text: 'Knits' },
      { template: 'label', text: 'x'.repeat(101) },
    ]) {
      expect((await call(generateBadgeRoute, 'POST', body)).statusCode).toBe(400)
    }
    expect(uploadBadgeImage).not.toHaveBeenCalled()
  })

  test('says so when the upload fails', async () => {
    ;(uploadBadgeImage as jest.Mock).mockRejectedValueOnce(new Error('R2 down'))
    const res = await call(generateBadgeRoute, 'POST', { template: 'label' })
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toBe("Couldn't upload the badge. Try again.")
  })
})
