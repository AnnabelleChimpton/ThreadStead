/**
 * Admin's policy texts, against a real Postgres. What residents agree to is
 * versioned by when a text last changed (currentPolicyVersion). Every save
 * stamped all four, so pressing Save with nothing changed made a new
 * version; and a value that wasn't text, part-way through, left the first
 * texts saved and the rest not.
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

import policiesRoute from '@/pages/api/admin/policies'
import { createSession } from '@/lib/auth/server'
import { POLICY_KEYS, currentPolicyVersion } from '@/lib/domain/users/terms-agreement'

const stamp = Date.now()
let cookie: string

async function call(method: string, body?: unknown) {
  const req = { method, url: '/api/admin/policies', query: {}, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await policiesRoute(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

const rows = () => db.siteConfig.findMany({ where: { key: { in: [...POLICY_KEYS] } }, orderBy: { key: 'asc' } })

beforeAll(async () => {
  const admin = await db.user.create({ data: { did: `did:key:policy-admin-${stamp}`, role: 'admin' } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, admin.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
  await db.siteConfig.deleteMany({ where: { key: { in: [...POLICY_KEYS] } } })
})

afterAll(async () => {
  await db.siteConfig.deleteMany({ where: { key: { in: [...POLICY_KEYS] } } })
  await db.user.deleteMany({ where: { did: `did:key:policy-admin-${stamp}` } })
  await db.$disconnect()
})

test('saving the built-in texts unchanged writes nothing: still "built-in"', async () => {
  const { policies } = (await call('GET')).body
  const res = await call('PUT', { policies })
  expect(res.statusCode).toBe(200)
  expect(res.body.message).toBe("Nothing's changed.")
  expect(await rows()).toEqual([])
  expect(await currentPolicyVersion()).toBe('built-in')
})

test('a changed text is saved; saving it again unchanged keeps the version', async () => {
  const { policies } = (await call('GET')).body
  expect((await call('PUT', { policies: { ...policies, terms_simple: 'Be kind.' } })).body.message).toBe('Policies saved.')
  const after = await rows()
  expect(after.map((r) => r.key)).toEqual(['terms_simple'])

  const again = await call('PUT', { policies: { ...policies, terms_simple: 'Be kind.' } })
  expect(again.body.message).toBe("Nothing's changed.")
  expect((await rows())[0].updatedAt).toEqual(after[0].updatedAt)
})

test('a value that isn\'t text is a 400 and saves none of them', async () => {
  const { policies } = (await call('GET')).body
  const before = await rows()
  const res = await call('PUT', { policies: { ...policies, terms_simple: 'Changed', privacy_full: { x: 1 } } })
  expect(res.statusCode).toBe(400)
  expect(await rows()).toEqual(before)
})
