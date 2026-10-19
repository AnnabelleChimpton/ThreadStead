/**
 * Seasonal collections against a real Postgres: marking one current (admin
 * only, catalog names only), the street's line, and limited items showing
 * in the palette only inside their window.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(), isAdmin: (u: any) => u?.role === 'admin' }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))

import collectionsHandler from '@/pages/api/admin/decorations/collections'
import availableHandler from '@/pages/api/decorations/available'
import { getSessionUser } from '@/lib/auth/server'
import { CURRENT_COLLECTION_KEY, getCollectionNotice, noticeText } from '@/lib/pixel-homes/collections'

async function call(handler: any, viewer: { id: string; role: string } | null, method = 'GET', body?: any) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer)
  const req = { method, query: {}, body, headers: {}, cookies: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
    end() { return this },
  }
  await handler(req, res as NextApiResponse)
  return res
}

const admin = { id: 'u_admin', role: 'admin' }
const member = { id: 'u_member', role: 'member' }
const day = 24 * 60 * 60 * 1000
const item = (itemId: string, collection: string | null, release: Record<string, any> = {}) =>
  db.decorationItem.create({
    data: { itemId, name: itemId, type: 'plant', category: 'plants', zone: 'front_yard', collection, ...release },
  })

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "DecorationItem", "SiteConfig" RESTART IDENTITY CASCADE')
  for (const u of [admin, member]) await db.user.create({ data: { id: u.id, did: `did:test:${u.id}`, role: u.role as any } })
  const now = Date.now()
  await item('pumpkin', 'Autumn 2026', { releaseType: 'LIMITED_TIME', releaseStartAt: new Date(now - day), releaseEndAt: new Date('2099-11-30T23:59:59Z') })
  await item('leaf_pile', 'Autumn 2026', { releaseType: 'LIMITED_TIME', releaseStartAt: new Date(now - day), releaseEndAt: new Date(now + day) })
  await item('snowman', 'Winter 2026', { releaseType: 'LIMITED_TIME', releaseStartAt: new Date(now + 30 * day), releaseEndAt: new Date(now + 60 * day) })
  await item('roses', null)
})
afterAll(() => db.$disconnect())

test('only admins can see or set the current collection', async () => {
  expect((await call(collectionsHandler, member)).statusCode).toBe(403)
  expect((await call(collectionsHandler, null, 'POST', { current: 'Autumn 2026' })).statusCode).toBe(401)
  expect(await db.siteConfig.count()).toBe(0)
})

test('the admin list shows each collection and what is out now', async () => {
  const res = await call(collectionsHandler, admin)
  expect(res.body.current).toBeNull()
  expect(res.body.collections.map((c: any) => [c.name, c.items, c.outNow])).toEqual([
    ['Autumn 2026', 2, 2],
    ['Winter 2026', 1, 0],
  ])
})

test('only a collection that exists can be made current', async () => {
  const res = await call(collectionsHandler, admin, 'POST', { current: 'Spring 2031' })
  expect(res.statusCode).toBe(400)
  expect(await db.siteConfig.count()).toBe(0)
})

test('marking one current puts one line on the street; none clears it', async () => {
  const res = await call(collectionsHandler, admin, 'POST', { current: 'Autumn 2026' })
  expect(res.statusCode).toBe(200)
  expect(res.body.current).toBe('Autumn 2026')
  expect(noticeText((await getCollectionNotice(db))!)).toBe('Autumn 2026 decorations are out until Nov 30.')

  await call(collectionsHandler, admin, 'POST', { current: null })
  expect(await db.siteConfig.findUnique({ where: { key: CURRENT_COLLECTION_KEY } })).toBeNull()
  expect(await getCollectionNotice(db)).toBeNull()
})

test('a current collection that is not out yet says nothing', async () => {
  await call(collectionsHandler, admin, 'POST', { current: 'Winter 2026' })
  expect(await getCollectionNotice(db)).toBeNull()
})

test('the palette lists limited items only inside their window, with their collection', async () => {
  const res = await call(availableHandler, member)
  const all = Object.values(res.body.decorations).flat() as any[]
  expect(all.map((d) => d.id).sort()).toEqual(['leaf_pile', 'pumpkin', 'roses'])
  expect(all.find((d) => d.id === 'pumpkin')).toMatchObject({ collection: 'Autumn 2026', isLimitedTime: true })
  expect(all.find((d) => d.id === 'roses').collection).toBeNull()
})
