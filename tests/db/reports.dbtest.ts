/**
 * Reporting, against a real Postgres: a report of a post goes through, and
 * a malformed one gets a 400 that says what to fix, not a 500. (The button
 * sent its request without the CSRF token, so every report was refused;
 * components/ui/feedback/__tests__/ReportButton.test.tsx pins that.)
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

import reportRoute from '@/pages/api/reports/create'
import { createSession } from '@/lib/auth/server'

let reporterCookie: string
let postId: string
let authorId: string

async function report(body: unknown) {
  const req = { method: 'POST', url: '/api/reports/create', query: {}, body, headers: { cookie: reporterCookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await reportRoute(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeAll(async () => {
  const stamp = Date.now()
  const reporter = await db.user.create({ data: { did: `did:key:reporter-${stamp}` } })
  const author = await db.user.create({ data: { did: `did:key:author-${stamp}` } })
  authorId = author.id
  postId = (await db.post.create({ data: { authorId, bodyText: 'x', visibility: 'public' } })).id
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, reporter.id)
  reporterCookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.userReport.deleteMany({ where: { targetId: postId } })
  await db.$disconnect()
})

test('a report of a post goes through, naming its author', async () => {
  const res = await report({ reportType: 'post', targetId: postId, reason: 'spam', description: 'Selling essays' })
  expect(res.statusCode).toBe(201)
  expect(await db.userReport.findFirst({ where: { targetId: postId }, select: { reportedUserId: true, description: true } })).toEqual({ reportedUserId: authorId, description: 'Selling essays' })
})

test.each([
  [{ reportType: 'post', targetId: { not: 'x' }, reason: 'spam' }, "Target id isn't the right kind of value."],
  [{ reportType: 'post', targetId: 'p', reason: 'other', customReason: 42 }, "Custom reason isn't the right kind of value."],
  [{ reportType: 'post', targetId: 'p', reason: 'spam', description: 'x'.repeat(501) }, 'Description is too long: 500 characters at most.'],
  [{ reportType: 'nonsense', targetId: 'p', reason: 'spam' }, "Report type isn't one of the choices."],
  [{ reportType: 'post', targetId: 'p', reason: 'other' }, "Say what's wrong in a few words."],
])('%j is a 400: %s', async (body, error) => {
  const res = await report(body)
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe(error)
})
