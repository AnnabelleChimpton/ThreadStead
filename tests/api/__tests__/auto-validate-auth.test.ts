/**
 * POST /api/community-index/auto-validate hard-deletes index rows: admins
 * (with CSRF) or a caller holding CRAWLER_API_KEY only. It used to be
 * auth:'none'.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/middleware/generalRateLimiting', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/community-index/validation/auto-validate', () => ({
  runAutoValidation: jest.fn(async () => ({ processed: 2, results: { approved: 1, rejected: 1, skipped: 0 } })),
}))

import handler from '@/pages/api/community-index/auto-validate'
import { getSessionUser } from '@/lib/auth/server'
import { runAutoValidation } from '@/lib/community-index/validation/auto-validate'
import { resetServerEnvCache } from '@/lib/config/env'

const CSRF = 'tok123'
const withCsrf = { cookie: `csrf_token=${CSRF}`, 'x-csrf-token': CSRF }

async function call(headers: Record<string, string>, session: object | null, body: unknown = {}) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(session)
  const req = {
    method: 'POST',
    body,
    headers,
    cookies: headers.cookie ? { csrf_token: CSRF } : {},
    url: '/api/community-index/auto-validate',
    query: {},
  } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
  }
  await handler(req, res as NextApiResponse)
  return res
}

beforeEach(() => {
  process.env.CRAWLER_API_KEY = 'cron-secret-key'
  resetServerEnvCache()
  jest.clearAllMocks()
})
afterAll(() => {
  delete process.env.CRAWLER_API_KEY
  resetServerEnvCache()
})

test('anonymous callers get 401 and nothing runs', async () => {
  const res = await call({ ...withCsrf }, null)
  expect(res.statusCode).toBe(401)
  expect(runAutoValidation).not.toHaveBeenCalled()
})

test('signed-in members get 403', async () => {
  const res = await call({ ...withCsrf }, { id: 'u1', role: 'member' })
  expect(res.statusCode).toBe(403)
  expect(runAutoValidation).not.toHaveBeenCalled()
})

test('a wrong bearer key is treated as anonymous', async () => {
  const res = await call({ authorization: 'Bearer nope' }, null)
  expect([401, 403]).toContain(res.statusCode)
  expect(runAutoValidation).not.toHaveBeenCalled()
})

test('admins run it (force passed through)', async () => {
  const res = await call({ ...withCsrf }, { id: 'a1', role: 'admin' }, { force: true })
  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ success: true, processed: 2, results: { approved: 1, rejected: 1, skipped: 0 } })
  expect(runAutoValidation).toHaveBeenCalledWith({ force: true })
})

test('a cron with CRAWLER_API_KEY runs it without a session or CSRF', async () => {
  const res = await call({ authorization: 'Bearer cron-secret-key' }, null)
  expect(res.statusCode).toBe(200)
  expect(runAutoValidation).toHaveBeenCalledWith({ force: false })
})
