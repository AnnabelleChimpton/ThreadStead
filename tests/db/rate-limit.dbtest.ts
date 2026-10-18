/**
 * Per-category API rate limits against a real Postgres (the RateLimit table).
 * Windows, resets, headers and fail-open are behavior of the SQL, so they are
 * tested here rather than against a mocked Prisma.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => null) }))

import {
  RATE_LIMIT_CONFIGS,
  checkRateLimit,
  cleanupExpiredRateLimits,
  rateLimitCheck,
  signupLimitCheck,
  withRateLimit,
} from '@/lib/server/http/rate-limit'
import { getSessionUser } from '@/lib/auth/server'

const UPLOADS = RATE_LIMIT_CONFIGS.uploads // 5 per hour in test

function fakeRes() {
  const headers: Record<string, string> = {}
  const r = {
    statusCode: 200,
    body: undefined as unknown,
    headers,
    setHeader: (k: string, v: string) => ((headers[k] = v), r),
    status: (c: number) => ((r.statusCode = c), r),
    json: (b: unknown) => ((r.body = b), r),
  }
  return r
}

function fakeReq(ip = '203.0.113.7'): NextApiRequest {
  return { method: 'POST', headers: { 'x-forwarded-for': ip }, socket: {} } as unknown as NextApiRequest
}

beforeEach(async () => {
  await db.rateLimit.deleteMany({})
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
})

afterAll(async () => {
  await db.$disconnect()
})

describe('checkRateLimit', () => {
  it('allows exactly `limit` requests per window, counting down', async () => {
    const remaining: number[] = []
    for (let i = 0; i < UPLOADS.limit; i++) {
      const r = await checkRateLimit('ip:a', 'uploads')
      expect(r.allowed).toBe(true)
      remaining.push(r.remaining)
    }
    expect(remaining).toEqual([4, 3, 2, 1, 0])
    const blocked = await checkRateLimit('ip:a', 'uploads')
    expect(blocked).toMatchObject({ allowed: false, remaining: 0, total: UPLOADS.limit })
  })

  it('keeps identifiers and categories separate', async () => {
    for (let i = 0; i < UPLOADS.limit; i++) await checkRateLimit('ip:a', 'uploads')
    expect((await checkRateLimit('ip:a', 'uploads')).allowed).toBe(false)
    expect((await checkRateLimit('ip:b', 'uploads')).allowed).toBe(true)
    expect((await checkRateLimit('ip:a', 'posts')).allowed).toBe(true)
  })

  it('starts a fresh window once the old one has passed', async () => {
    for (let i = 0; i < UPLOADS.limit; i++) await checkRateLimit('ip:a', 'uploads')
    await db.rateLimit.updateMany({
      where: { identifier: 'ip:a' },
      data: { windowStart: new Date(Date.now() - UPLOADS.windowMs - 1000) },
    })
    const r = await checkRateLimit('ip:a', 'uploads')
    expect(r).toMatchObject({ allowed: true, remaining: UPLOADS.limit - 1 })
    const row = await db.rateLimit.findFirstOrThrow({ where: { identifier: 'ip:a' } })
    expect(row.requestCount).toBe(1)
  })

  it('reports resetTime as window start + window length', async () => {
    const before = Date.now()
    const r = await checkRateLimit('ip:a', 'uploads')
    const row = await db.rateLimit.findFirstOrThrow({ where: { identifier: 'ip:a' } })
    expect(r.resetTime.getTime()).toBe(row.windowStart.getTime() + UPLOADS.windowMs)
    expect(row.windowStart.getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(row.expiresAt.getTime()).toBeGreaterThan(r.resetTime.getTime())
  })

  it('fails open (allows) when the database errors', async () => {
    const spy = jest.spyOn(db, '$queryRaw').mockRejectedValueOnce(new Error('db down'))
    jest.spyOn(console, 'error').mockImplementationOnce(() => {})
    const r = await checkRateLimit('ip:a', 'uploads')
    expect(r).toMatchObject({ allowed: true, remaining: UPLOADS.limit })
    spy.mockRestore()
  })
})

// Concurrent bursts (one atomic upsert since 2960427): security-races.dbtest.ts

describe('rateLimitCheck / withRateLimit', () => {
  it('sets X-RateLimit headers, then 429 with Retry-After once over', async () => {
    let res = fakeRes()
    for (let i = 0; i < UPLOADS.limit; i++) {
      res = fakeRes()
      expect(await rateLimitCheck(fakeReq(), res as unknown as NextApiResponse, 'uploads')).toBe(true)
    }
    expect(res.headers['X-RateLimit-Limit']).toBe(String(UPLOADS.limit))
    expect(res.headers['X-RateLimit-Remaining']).toBe('0')

    res = fakeRes()
    expect(await rateLimitCheck(fakeReq(), res as unknown as NextApiResponse, 'uploads')).toBe(false)
    expect(res.statusCode).toBe(429)
    const retry = Number(res.headers['Retry-After'])
    expect(retry).toBeGreaterThan(0)
    expect(retry).toBeLessThanOrEqual(UPLOADS.windowMs / 1000)
  })

  it('limits signed-in users by user id, not IP', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u1' })
    const handler = jest.fn(async () => {})
    for (let i = 0; i < UPLOADS.limit; i++) {
      await withRateLimit('uploads')(handler)(fakeReq(`198.51.100.${i}`), fakeRes() as unknown as NextApiResponse)
    }
    const res = fakeRes()
    await withRateLimit('uploads')(handler)(fakeReq('198.51.100.99'), res as unknown as NextApiResponse)
    expect(res.statusCode).toBe(429)
    expect(handler).toHaveBeenCalledTimes(UPLOADS.limit)
    expect(await db.rateLimit.count({ where: { identifier: 'user:u1' } })).toBe(1)
  })

  it('limits anonymous callers by the client entry, not the spoofable first one', async () => {
    // Production (TRUSTED_PROXY_HOPS=1): Cloudflare appends the visitor, then nginx
    // appends the visitor it resolved from CF-Connecting-IP: "<junk>, <client>, <client>".
    for (let i = 0; i < UPLOADS.limit; i++) {
      await rateLimitCheck(fakeReq(`6.6.6.${i}, 203.0.113.9, 203.0.113.9`), fakeRes() as unknown as NextApiResponse, 'uploads')
    }
    const res = fakeRes()
    await rateLimitCheck(fakeReq('6.6.6.99, 203.0.113.9'), res as unknown as NextApiResponse, 'uploads')
    expect(res.statusCode).toBe(429)
    expect((await db.rateLimit.findMany()).map((r) => r.identifier)).toEqual(['ip:203.0.113.9'])
  })
})

describe('signupLimitCheck', () => {
  afterEach(async () => {
    await db.signupAttempt.deleteMany({ where: { ipAddress: '203.0.113.50' } })
    await db.ipSignupTracking.deleteMany({ where: { ipAddress: '203.0.113.50' } })
  })

  it('keeps a blocked IP blocked whatever the client prepends to X-Forwarded-For', async () => {
    await db.ipSignupTracking.create({ data: { ipAddress: '203.0.113.50', isBlocked: true, blockedReason: 'test block' } })
    for (const spoof of ['', '6.6.6.6, ', '1.1.1.1, 2.2.2.2, ']) {
      const res = fakeRes()
      const ok = await signupLimitCheck(fakeReq(`${spoof}203.0.113.50`), res as unknown as NextApiResponse)
      expect(ok).toBe(false)
      expect(res.statusCode).toBe(429)
    }
  })
})

describe('cleanupExpiredRateLimits', () => {
  it('deletes only expired rows', async () => {
    await checkRateLimit('ip:fresh', 'uploads')
    await checkRateLimit('ip:old', 'uploads')
    await db.rateLimit.updateMany({ where: { identifier: 'ip:old' }, data: { expiresAt: new Date(Date.now() - 1000) } })
    expect(await cleanupExpiredRateLimits()).toBe(1)
    expect((await db.rateLimit.findMany()).map((r) => r.identifier)).toEqual(['ip:fresh'])
  })
})
