/**
 * Admin's decoration routes, against a real Postgres, with the bodies the
 * admin pages send. Editing wiped every item's SVG art (the form sends ""
 * for the art it doesn't load); a cleared size box was a 500; a limited-time
 * item couldn't be edited at all; Grant and the claim-code button were
 * refused (their bodies didn't match); and a release wiped the item's limit.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/server/http/csrf', () => ({
  ...jest.requireActual('@/lib/server/http/csrf'),
  csrfProtection: jest.fn(async () => true),
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  ...jest.requireActual('@/lib/server/http/rate-limit'),
  rateLimitCheck: jest.fn(async () => true),
}))

import editRoute from '@/pages/api/admin/decorations/[id]'
import createRoute from '@/pages/api/admin/decorations/index'
import grantRoute from '@/pages/api/admin/decorations/[id]/grant'
import releaseRoute from '@/pages/api/admin/decorations/[id]/release'
import { createSession } from '@/lib/auth/server'

let cookie: string
let residentId: string
const stamp = Date.now()

async function call(route: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>, method: string, query: Record<string, string>, body?: unknown) {
  const req = { method, url: '/api/admin/decorations', query, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v; return this },
    getHeader(k: string) { return this.headers[k.toLowerCase()] },
    end() { return this },
  }
  await route(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

async function item(over: Record<string, unknown> = {}) {
  return db.decorationItem.create({
    data: { itemId: `test_${stamp}_${Math.random().toString(36).slice(2, 8)}`, name: 'Roses', type: 'plant', category: 'plants', zone: 'front_yard', iconSvg: '<svg>icon</svg>', renderSvg: '<svg>art</svg>', gridWidth: 2, gridHeight: 1, ...over },
  })
}

/** What pages/admin/decorations.tsx sends when an item is saved from its edit form */
const editForm = (d: { itemId: string; releaseType: string }) => ({
  itemId: d.itemId, name: 'Red roses', type: 'plant', category: 'plants', zone: 'front_yard', section: '',
  iconSvg: '', renderSvg: '', description: '', gridWidth: 2, gridHeight: 1, releaseType: d.releaseType, isActive: true,
})

beforeAll(async () => {
  const admin = await db.user.create({ data: { did: `did:key:deco-admin-${stamp}`, role: 'admin' } })
  residentId = (await db.user.create({ data: { did: `did:key:deco-resident-${stamp}` } })).id
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, admin.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.userDecorationClaim.deleteMany({ where: { decoration: { itemId: { startsWith: `test_${stamp}` } } } })
  await db.decorationItem.deleteMany({ where: { itemId: { startsWith: `test_${stamp}` } } })
  await db.$disconnect()
})

test("saving the edit form keeps the item's art", async () => {
  const d = await item()
  const res = await call(editRoute, 'PUT', { id: d.id }, editForm(d))
  expect(res.statusCode).toBe(200)
  expect(await db.decorationItem.findUnique({ where: { id: d.id }, select: { name: true, iconSvg: true, renderSvg: true } })).toEqual({ name: 'Red roses', iconSvg: '<svg>icon</svg>', renderSvg: '<svg>art</svg>' })
})

test('a cleared size box keeps the size, not a 500', async () => {
  const d = await item()
  const res = await call(editRoute, 'PUT', { id: d.id }, { ...editForm(d), gridWidth: null })
  expect(res.statusCode).toBe(200)
  expect((await db.decorationItem.findUnique({ where: { id: d.id } }))?.gridWidth).toBe(2)
})

test('a limited-time item can be edited, and keeps its window', async () => {
  const start = new Date(Date.now() + 86_400_000)
  const end = new Date(Date.now() + 2 * 86_400_000)
  const d = await item({ releaseType: 'LIMITED_TIME', releaseStartAt: start, releaseEndAt: end })
  const res = await call(editRoute, 'PUT', { id: d.id }, editForm(d))
  expect(res.statusCode).toBe(200)
  expect(await db.decorationItem.findUnique({ where: { id: d.id }, select: { releaseStartAt: true, releaseEndAt: true } })).toEqual({ releaseStartAt: start, releaseEndAt: end })
})

test('a bad date or release type is a 400, not a 500', async () => {
  const d = await item()
  expect((await call(editRoute, 'PUT', { id: d.id }, { releaseType: 'SOMETIMES' })).statusCode).toBe(400)
  expect((await call(editRoute, 'PUT', { id: d.id }, { releaseType: 'LIMITED_TIME', releaseStartAt: 'soon', releaseEndAt: 'later' })).statusCode).toBe(400)
})

test('a new item from the form with a cleared size box is 1×1', async () => {
  const itemId = `test_${stamp}_new`
  const res = await call(createRoute, 'POST', {}, { itemId, name: 'Stones', type: 'path', category: 'paths', zone: 'front_yard', section: '', iconSvg: '<svg/>', renderSvg: '<svg/>', description: '', gridWidth: null, gridHeight: null, releaseType: 'PUBLIC', isActive: true })
  expect(res.statusCode).toBe(201)
  expect(await db.decorationItem.findUnique({ where: { itemId }, select: { gridWidth: true, gridHeight: true } })).toEqual({ gridWidth: 1, gridHeight: 1 })
})

test('Grant gives the resident the item', async () => {
  const d = await item({ releaseType: 'ADMIN_ONLY' })
  const res = await call(grantRoute, 'POST', { id: d.id }, { userIds: [residentId] })
  expect(res.statusCode).toBe(200)
  expect(await db.userDecorationClaim.count({ where: { decorationId: d.id, userId: residentId } })).toBe(1)
})

test("the claim-code button makes a code and a link, and a later release keeps the item's limit", async () => {
  const d = await item({ maxClaims: 5 })
  const made = await call(releaseRoute, 'POST', { id: d.id }, { releaseType: 'CLAIM_CODE', generateCode: true, maxClaims: 10 })
  expect(made.statusCode).toBe(200)
  const code = (await db.decorationItem.findUnique({ where: { id: d.id } }))!.claimCode
  expect(code).toMatch(/^[0-9A-F]{8}$/)
  expect(made.body.claimUrl).toContain(`/claim/${code}`)

  const again = await call(releaseRoute, 'POST', { id: d.id }, { releaseType: 'CLAIM_CODE' })
  expect(again.statusCode).toBe(200)
  expect(await db.decorationItem.findUnique({ where: { id: d.id }, select: { claimCode: true, maxClaims: true } })).toEqual({ claimCode: code, maxClaims: 10 })
})
