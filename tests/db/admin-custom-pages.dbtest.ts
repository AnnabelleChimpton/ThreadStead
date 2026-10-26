/**
 * Saving a custom page in Admin moves the homepage and landing flags with
 * the save, or not at all, against a real Postgres. They were cleared before
 * the save, outside a transaction, so a taken address left the site with no
 * homepage or landing page.
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

import createRoute from '@/pages/api/admin/custom-pages'
import updateRoute from '@/pages/api/admin/custom-pages/[id]'
import { createSession } from '@/lib/auth/server'

let cookie: string

async function call(route: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>, method: string, query: Record<string, string>, body?: unknown) {
  const req = { method, url: '/api/admin/custom-pages', query, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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

/** What PageForm sends */
const form = (slug: string, flags: { isHomepage?: boolean; isLandingPage?: boolean } = {}) => ({
  slug, title: 'A page', content: '<p>Hi</p>', published: true, showInNav: false, navOrder: 0, navDropdown: null, hideNavbar: false, isHomepage: false, isLandingPage: false, ...flags,
})

beforeAll(async () => {
  const admin = await db.user.create({ data: { did: `did:key:pages-admin-${Date.now()}`, role: 'admin' } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, admin.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

beforeEach(async () => {
  await db.customPage.deleteMany({})
})

afterAll(async () => {
  await db.customPage.deleteMany({})
  await db.$disconnect()
})

test('a new page with a taken address keeps the current homepage and landing page', async () => {
  await db.customPage.create({ data: { ...form('home', { isHomepage: true, isLandingPage: true }) } })
  const res = await call(createRoute, 'POST', {}, form('home', { isHomepage: true, isLandingPage: true }))
  expect(res.statusCode).toBe(400)
  expect(await db.customPage.findMany({ select: { slug: true, isHomepage: true, isLandingPage: true } })).toEqual([{ slug: 'home', isHomepage: true, isLandingPage: true }])
})

test('moving to a taken address keeps the other page the homepage', async () => {
  await db.customPage.create({ data: { ...form('home', { isHomepage: true }) } })
  const other = await db.customPage.create({ data: form('about') })
  const res = await call(updateRoute, 'PUT', { id: other.id }, form('home', { isHomepage: true }))
  expect(res.statusCode).toBe(400)
  expect((await db.customPage.findUnique({ where: { slug: 'home' } }))?.isHomepage).toBe(true)
})

test('a new homepage takes the flag from the old one', async () => {
  await db.customPage.create({ data: { ...form('home', { isHomepage: true }) } })
  const res = await call(createRoute, 'POST', {}, form('new-home', { isHomepage: true }))
  expect(res.statusCode).toBe(200)
  expect(await db.customPage.findMany({ where: { isHomepage: true }, select: { slug: true } })).toEqual([{ slug: 'new-home' }])
})

test('an address with capitals or spaces is a 400 that says why', async () => {
  const res = await call(createRoute, 'POST', {}, form('My Page'))
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe('The address can only have lowercase letters, numbers and hyphens.')
})
