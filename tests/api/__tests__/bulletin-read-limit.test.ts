/**
 * The board's read has its own rate-limit bucket. It used to share `posts`
 * (20 a minute), and the page showed a 429 as "No notes on the board yet".
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: { bulletin: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), create: jest.fn(async () => ({ id: 'b1' })) } },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'u1', role: 'member' })) }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))

import handler from '@/pages/api/bulletin/index'
import { rateLimitCheck } from '@/lib/server/http/rate-limit'

async function call(method: string, body?: unknown) {
  const req = { method, query: {}, body, headers: {}, url: '/api/bulletin' } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader() { return this },
  }
  await handler(req, res as NextApiResponse)
  return res
}

beforeEach(() => jest.clearAllMocks())

test('reading the board uses the reads bucket, posting a note the posts one', async () => {
  await call('GET')
  expect((rateLimitCheck as jest.Mock).mock.calls[0][2]).toBe('reads')
  await call('POST', { category: 'SHARING', text: 'hello' })
  expect((rateLimitCheck as jest.Mock).mock.calls[1][2]).toBe('posts')
})

test('an over-limit read answers before touching the board', async () => {
  ;(rateLimitCheck as jest.Mock).mockImplementationOnce(async (_req: unknown, res: any) => {
    res.status(429).json({ error: 'Too many requests' })
    return false
  })
  const res = await call('GET')
  expect(res.statusCode).toBe(429)
  const { db } = jest.requireMock('@/lib/config/database/connection')
  expect(db.bulletin.findMany).not.toHaveBeenCalled()
})
