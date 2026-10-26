/**
 * Admin > Indie Index's block form, against a real Postgres. A pasted
 * address was stored whole, so the block never matched a host; a domain
 * that wasn't text was a 500.
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

import blockedSitesRoute from '@/pages/api/admin/blocked-sites/index'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
const site = `spam-${stamp}.example.org`
let cookie: string

async function add(body: unknown) {
  const req = { method: 'POST', url: '/api/admin/blocked-sites', query: {}, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await blockedSitesRoute(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeAll(async () => {
  const admin = await db.user.create({ data: { did: `did:key:blocklist-admin-${stamp}`, role: 'admin' } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, admin.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.blockedSite.deleteMany({ where: { domain: site } })
  await db.user.deleteMany({ where: { did: `did:key:blocklist-admin-${stamp}` } })
  await db.$disconnect()
})

test('a pasted address is stored as the host it blocks', async () => {
  const res = await add({ domain: `https://www.${site}/some/page`, category: 'platform' })
  expect(res.statusCode).toBe(201)
  expect(res.body.domain).toBe(site)
  expect(await db.blockedSite.count({ where: { domain: site } })).toBe(1)
})

test('the same site again, written differently, is already blocked', async () => {
  expect((await add({ domain: site.toUpperCase(), category: 'platform' })).statusCode).toBe(409)
})

test.each([
  [{ domain: { not: 'x' }, category: 'platform' }],
  [{ domain: 'not a site', category: 'platform' }],
  [{ domain: 'example.net', category: '' }],
])('%#: a block the form wouldn\'t send is a 400, not a 500', async (body) => {
  expect((await add(body)).statusCode).toBe(400)
})
