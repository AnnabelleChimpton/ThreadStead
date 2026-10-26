/**
 * Admin's beta landing pages, against a real Postgres. A signup limit of
 * 75.5 (the Increase Limit prompt takes any number) or "100", or a name
 * that wasn't text, went to the database as a 500.
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

import createRoute from '@/pages/api/admin/beta-landing-pages/index'
import editRoute from '@/pages/api/admin/beta-landing-pages/[id]'
import limitRoute from '@/pages/api/admin/beta-landing-pages/[id]/limit'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
const slug = `launch-${stamp}`
let cookie: string
let pageId: string

async function call(route: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>, method: string, query: Record<string, string>, body: unknown) {
  const req = { method, url: '/api/admin/beta-landing-pages', query, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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

/** What BetaLandingPagesSection's form sends */
const form = { name: 'Launch', slug, title: 'Come on in', description: '', content: '', signupLimit: 50 }

beforeAll(async () => {
  const admin = await db.user.create({ data: { did: `did:key:landing-admin-${stamp}`, role: 'admin' } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, admin.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.user.deleteMany({ where: { did: `did:key:landing-admin-${stamp}` } })
  await db.$disconnect()
})

test('the form makes a page, edits it, and raises its limit', async () => {
  const made = await call(createRoute, 'POST', {}, form)
  expect(made.statusCode).toBe(200)
  pageId = made.body.landingPage.id
  expect((await call(editRoute, 'PUT', { id: pageId }, { ...form, title: 'Welcome' })).statusCode).toBe(200)
  const raised = await call(limitRoute, 'PUT', { id: pageId }, { signupLimit: 100 })
  expect(raised.statusCode).toBe(200)
  expect(await db.betaLandingPage.findUnique({ where: { id: pageId }, select: { title: true, signupLimit: true } })).toEqual({ title: 'Welcome', signupLimit: 100 })
})

test.each([[75.5], ['100'], [0]])('a limit of %p is a 400, not a 500', async (signupLimit) => {
  expect((await call(limitRoute, 'PUT', { id: pageId }, { signupLimit })).statusCode).toBe(400)
  expect((await call(editRoute, 'PUT', { id: pageId }, { ...form, signupLimit })).statusCode).toBe(400)
  expect((await call(createRoute, 'POST', {}, { ...form, slug: `${slug}-x`, signupLimit })).statusCode).toBe(400)
})

test('a name that isn\'t text, or a bad slug, is a 400', async () => {
  expect((await call(createRoute, 'POST', {}, { ...form, slug: `${slug}-y`, name: { x: 1 } })).statusCode).toBe(400)
  const bad = await call(editRoute, 'PUT', { id: pageId }, { ...form, slug: 'Has Spaces' })
  expect(bad.statusCode).toBe(400)
  expect(bad.body.error).toBe('A slug is lowercase letters, numbers, hyphens and underscores.')
})
