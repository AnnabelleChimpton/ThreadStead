/**
 * Resetting a password from an emailed link, against a real Postgres. The
 * new password is checked before the link is used up (a bad one used to
 * burn it, then bcrypt threw), the site's strength rule applies here too,
 * and a token that isn't one gets a plain answer, not Prisma's error text.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/server/http/rate-limit', () => ({
  ...jest.requireActual('@/lib/server/http/rate-limit'),
  rateLimitCheck: jest.fn(async () => true),
}))

import resetRoute from '@/pages/api/auth/reset-password'
import { createPasswordResetToken } from '@/lib/email-login'

async function reset(body: unknown) {
  const req = { method: 'POST', url: '/api/auth/reset-password', query: {}, body, headers: {}, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await resetRoute(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

let userId: string

beforeAll(async () => {
  userId = (await db.user.create({ data: { did: `did:key:reset-${Date.now()}` } })).id
})

afterAll(async () => {
  await db.user.delete({ where: { id: userId } })
  await db.$disconnect()
})

test("a weak password is refused, in the rule's words, and the link still works after", async () => {
  const token = await createPasswordResetToken(userId, 'pat@example.com')
  const weak = await reset({ token, newPassword: 'password' })
  expect(weak.statusCode).toBe(400)
  expect(weak.body.error).toBe('Password must contain at least one uppercase letter')

  const strong = await reset({ token, newPassword: 'Garden-beds-7' })
  expect(strong.statusCode).toBe(200)
  expect((await db.user.findUnique({ where: { id: userId } }))?.passwordHash).toBeTruthy()
})

test('a used link says so plainly', async () => {
  const token = await createPasswordResetToken(userId, 'pat@example.com')
  expect((await reset({ token, newPassword: 'Garden-beds-7' })).statusCode).toBe(200)
  const again = await reset({ token, newPassword: 'Garden-beds-8' })
  expect(again.statusCode).toBe(400)
  expect(again.body.error).toBe('That reset link has expired or was already used. Ask for a new one.')
})

test("a token that isn't text is a 400 without Prisma's error text", async () => {
  const res = await reset({ token: { not: 'x' }, newPassword: 'Garden-beds-7' })
  expect(res.statusCode).toBe(400)
  expect(JSON.stringify(res.body)).not.toMatch(/prisma|invocation/i)
})
