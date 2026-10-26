/**
 * Tracking an invite share, against a real Postgres: what the invite codes
 * panel sends goes in; a body of any size or type was stored as sent.
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

import trackShare from '@/pages/api/beta-invite-codes/[codeId]/track-share'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
let cookie: string
let codeId: string

async function share(body: unknown) {
  const req = { method: 'POST', url: '/api/beta-invite-codes/x/track-share', query: { codeId }, body, headers: { cookie, 'user-agent': 'Mozilla/5.0 test' }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await trackShare(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeAll(async () => {
  const me = await db.user.create({ data: { did: `did:key:sharer-${stamp}` } })
  codeId = (await db.betaInviteCode.create({ data: { code: `SHARE${stamp}`, generatedBy: me.id } })).id
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, me.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.user.deleteMany({ where: { did: `did:key:sharer-${stamp}` } })
  await db.$disconnect()
})

test("the panel's copy-link share is noted", async () => {
  const res = await share({ shareMethod: 'copy_link', referrer: 'https://homepageagain.com/settings' })
  expect(res.statusCode).toBe(200)
  expect(await db.betaInviteShare.count({ where: { codeId, shareMethod: 'copy_link' } })).toBe(1)
})

test.each([
  [{ shareMethod: 'x'.repeat(51) }],
  [{ shareMethod: 'copy_link', referrer: 'x'.repeat(2001) }],
  [{ shareMethod: 'copy_link', platform: { name: 'x' } }],
  [{}],
])('%#: a share the panel wouldn\'t send is a 400 and nothing is stored', async (body) => {
  const before = await db.betaInviteShare.count({ where: { codeId } })
  expect((await share(body)).statusCode).toBe(400)
  expect(await db.betaInviteShare.count({ where: { codeId } })).toBe(before)
})
