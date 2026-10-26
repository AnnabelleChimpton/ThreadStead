/**
 * Admin's IP blocks, against a real Postgres. A block is stored the way
 * signups record an address (normalizeIp), or it never matches anyone: a
 * stray space, "::ffff:" or a typo was stored as typed. A reason that
 * wasn't text was a 500.
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

import bulkRoute from '@/pages/api/admin/ip-tracking/index'
import blockRoute from '@/pages/api/admin/ip-tracking/[ipAddress]/block'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
let cookie: string

async function call(route: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>, query: Record<string, string>, body: unknown) {
  const req = { method: 'POST', url: '/api/admin/ip-tracking', query, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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

const blocked = (ipAddress: string) => db.ipSignupTracking.findUnique({ where: { ipAddress }, select: { isBlocked: true, blockedReason: true } })

beforeAll(async () => {
  const admin = await db.user.create({ data: { did: `did:key:ip-admin-${stamp}`, role: 'admin' } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, admin.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.ipSignupTracking.deleteMany({ where: { ipAddress: { in: ['192.0.2.10', '192.0.2.11', '2001:db8::1', '192.0.2.12'] } } })
  await db.user.deleteMany({ where: { did: `did:key:ip-admin-${stamp}` } })
  await db.$disconnect()
})

test('the bulk list is stored the way signups record addresses', async () => {
  const res = await call(bulkRoute, {}, { ipAddresses: [' 192.0.2.10 ', '::ffff:192.0.2.11', '2001:DB8::1', '192.0.2.10'], reason: 'Spam wave' })
  expect(res.statusCode).toBe(200)
  expect(res.body.message).toBe('Blocked 3 IP addresses.')
  for (const ip of ['192.0.2.10', '192.0.2.11', '2001:db8::1']) {
    expect(await blocked(ip)).toEqual({ isBlocked: true, blockedReason: 'Spam wave' })
  }
})

test('one typo in the list blocks nothing and says which', async () => {
  const res = await call(bulkRoute, {}, { ipAddresses: ['192.0.2.12', '192.0.2.300'] })
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe('"192.0.2.300" isn\'t an IP address. Nothing was blocked.')
  expect(await blocked('192.0.2.12')).toBeNull()
})

test('a single block is stored normalized; a reason that isn\'t text is a 400', async () => {
  expect((await call(blockRoute, { ipAddress: '::FFFF:192.0.2.12' }, {})).statusCode).toBe(200)
  expect(await blocked('192.0.2.12')).toEqual({ isBlocked: true, blockedReason: 'Manual block' })
  expect((await call(blockRoute, { ipAddress: '192.0.2.12' }, { reason: { x: 1 } })).statusCode).toBe(400)
  expect((await call(blockRoute, { ipAddress: 'not-an-ip' }, {})).statusCode).toBe(400)
})
