/**
 * GET /api/home/[handle]/badge and the ring members list's badges follow the
 * home's rules (profile visibility, blocks either way), against Postgres.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(), isAdmin: (u: any) => u?.role === 'admin' }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))

import badgeHandler from '@/pages/api/home/[handle]/badge'
import { getSessionUser } from '@/lib/auth/server'
import { badgeHandlesFor } from '@/lib/pixel-homes/house-badge'

async function person(handle: string, visibility: Visibility = 'public', home = true) {
  const id = `u_${handle}`
  await db.user.create({
    data: { id, did: `did:test:${handle}`, handles: { create: { handle, host: SITE_NAME } }, profile: { create: { displayName: handle, visibility } } },
  })
  if (home) await db.userHomeConfig.create({ data: { userId: id, houseTemplate: 'cottage_v1', roofColor: '#123456' } })
  return id
}

async function badge(handle: string, viewer: string | null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  const headers: Record<string, string> = {}
  const req = { method: 'GET', query: { handle }, headers: {}, cookies: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    send(b: any) { this.body = b; return this },
    json(b: any) { this.body = b; return this },
    end() { return this },
    setHeader(k: string, v: string) { headers[k.toLowerCase()] = v },
  }
  await badgeHandler(req, res as NextApiResponse)
  return { status: res.statusCode, body: res.body as string, headers }
}

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await person('pub')
  await person('shy', 'followers')
  await person('fan')
  await person('nohome', 'public', false)
  await person('grump')
  await db.follow.create({ data: { followerId: 'u_fan', followeeId: 'u_shy', status: 'accepted' } })
  await db.userBlock.create({ data: { blockerId: 'u_grump', blockedUserId: 'u_pub' } })
})
afterAll(() => db.$disconnect())

test('a public home’s badge is an SVG in its colours, kept only in the viewer’s browser', async () => {
  const res = await badge('pub', null)
  expect(res.status).toBe(200)
  expect(res.headers['content-type']).toContain('image/svg+xml')
  expect(res.headers['cache-control']).toBe('private, max-age=300')
  expect(res.headers['content-security-policy']).toContain("default-src 'none'")
  expect(res.body).toContain('fill="#123456"')
  expect(res.body).toContain('number 1</title>')
})

test('a home the viewer may not see, or no home, is a 404', async () => {
  expect((await badge('shy', null)).status).toBe(404)
  expect((await badge('shy', 'u_fan')).status).toBe(200)
  expect((await badge('pub', 'u_grump')).status).toBe(404)
  expect((await badge('nohome', null)).status).toBe(404)
  expect((await badge('nobody', null)).status).toBe(404)
})

test('the members list only asks for badges the viewer may see', async () => {
  const ids = ['u_pub', 'u_shy', 'u_nohome', 'did:remote:someone']
  expect(Object.fromEntries(await badgeHandlesFor(db, ids, null, SITE_NAME))).toEqual({ u_pub: 'pub' })
  expect(Object.fromEntries(await badgeHandlesFor(db, ids, 'u_fan', SITE_NAME))).toEqual({ u_pub: 'pub', u_shy: 'shy' })
  expect(Object.fromEntries(await badgeHandlesFor(db, ids, 'u_grump', SITE_NAME))).toEqual({})
})
