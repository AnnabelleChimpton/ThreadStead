/**
 * Saving Admin's site settings writes only what the form owns, against a
 * real Postgres. It sent every key back as the page loaded them: with no
 * site CSS saved (the bundled theme), that wrote an empty one, which turns
 * the theme off, and it put back the founder's note and policies.
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

import siteConfigRoute from '@/pages/api/admin/site-config'
import { createSession } from '@/lib/auth/server'

const KEYS = ['site_name', 'site_custom_css', 'founders_note', 'terms_full', 'privacy_full']
let cookie: string

async function call(method: string, body?: unknown) {
  const req = { method, url: '/api/admin/site-config', query: {}, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await siteConfigRoute(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

const stored = async (key: string) => (await db.siteConfig.findUnique({ where: { key } }))?.value

beforeAll(async () => {
  const admin = await db.user.create({ data: { did: `did:key:site-admin-${Date.now()}`, role: 'admin' } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, admin.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

beforeEach(async () => {
  await db.siteConfig.deleteMany({ where: { key: { in: KEYS } } })
})

afterAll(async () => {
  await db.siteConfig.deleteMany({ where: { key: { in: KEYS } } })
  await db.$disconnect()
})

test("a whole snapshot sent back doesn't turn the theme off or put back the note and policies", async () => {
  const loaded = (await call('GET')).body.config
  // Saved elsewhere since the page loaded
  await db.siteConfig.create({ data: { key: 'founders_note', value: 'Welcome in!' } })
  await db.siteConfig.create({ data: { key: 'terms_full', value: 'The real terms.' } })

  const res = await call('PUT', { config: { ...loaded, site_name: 'HomePageAgain' } })
  expect(res.statusCode).toBe(200)
  expect(await stored('site_name')).toBe('HomePageAgain')
  expect(await stored('site_custom_css')).toBeUndefined()
  expect(await stored('founders_note')).toBe('Welcome in!')
  expect(await stored('terms_full')).toBe('The real terms.')
})

test('a setting that is not text is refused', async () => {
  const res = await call('PUT', { config: { site_name: { not: 'x' } } })
  expect(res.statusCode).toBe(400)
  expect(await stored('site_name')).toBeUndefined()
})
