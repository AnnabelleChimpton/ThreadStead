/**
 * /api/extsearch and /api/extsearch/surprise spend paid Brave quota on a
 * cache miss: both are rate-limited ("search", 20/min per IP) and searches
 * go through an in-process LRU cache that reports hits in meta.cacheHit.
 *
 * The rate limiter runs for real against an in-memory RateLimit table.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ExtSearchResponse } from '@/lib/extsearch/types'

const rateRows = new Map<string, { requestCount: number; windowStart: number }>()

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    // checkRateLimit's single upsert, replayed in memory. Arguments are the
    // template values in the order the SQL uses them.
    $queryRaw: jest.fn(async (_sql: TemplateStringsArray, _id: string, identifier: string, category: string,
      nowTs: string, _expiresTs: string, windowStartTs: string, cap: number) => {
      const k = `${identifier}|${category}`
      const row = rateRows.get(k)
      if (row && row.windowStart > Date.parse(windowStartTs)) {
        row.requestCount = Math.min(row.requestCount + 1, cap)
      } else {
        rateRows.set(k, { requestCount: 1, windowStart: Date.parse(nowTs) })
      }
      const { requestCount, windowStart } = rateRows.get(k)!
      return [{ requestCount, windowStartMs: windowStart }]
    }),
    curatedSite: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), update: jest.fn() },
    indexedSite: { findMany: jest.fn(async () => []) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => null) }))

function response(q: string, opts: { partial?: boolean; ok?: boolean } = {}): ExtSearchResponse {
  return {
    query: { q },
    results: [{ url: `https://${q.replace(/\W/g, '')}.example/`, title: q, engine: 'brave' } as any],
    meta: {
      engines: [{ id: 'brave' as any, name: 'Brave', success: opts.ok ?? true, latencyMs: 5 }],
      totalMs: 5,
      partial: opts.partial ?? false,
      totalResults: 1,
      cacheHit: false,
    },
  }
}
jest.mock('@/lib/extsearch/registry', () => ({
  runExtSearch: jest.fn(async (query: any) => response(query.q)),
  getEngineStatus: jest.fn(() => []),
}))

import handler from '@/pages/api/extsearch'
import surpriseHandler from '@/pages/api/extsearch/surprise'
import { runExtSearch } from '@/lib/extsearch/registry'
import {
  cachedExtSearch,
  clearExtSearchCache,
  extSearchCacheSize,
  EXTSEARCH_CACHE_MAX_ENTRIES,
  EXTSEARCH_CACHE_TTL_MS,
  EXTSEARCH_PARTIAL_TTL_MS,
} from '@/lib/extsearch/cache'

const run = runExtSearch as jest.Mock

async function call(h: typeof handler, query: Record<string, string>, ip = '203.0.113.7') {
  const req = {
    method: 'GET',
    query,
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    cookies: {},
  } as unknown as NextApiRequest
  const headers: Record<string, string> = {}
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader(k: string, v: string) { headers[k.toLowerCase()] = v },
  }
  await h(req, res as NextApiResponse)
  return res
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH = 'true'
  rateRows.clear()
  clearExtSearchCache()
  run.mockClear()
  run.mockImplementation(async (query: any) => response(query.q))
})

describe('rate limit', () => {
  test('/api/extsearch allows 20 requests a minute per IP, then 429s', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await call(handler, { q: `query ${i}` })
      expect(res.statusCode).toBe(200)
    }
    const blocked = await call(handler, { q: 'one more' })
    expect(blocked.statusCode).toBe(429)
    expect(blocked.headers['retry-after']).toBeDefined()
    // the 21st request never reached the paid engines
    expect(run).toHaveBeenCalledTimes(20)

    // another IP has its own budget
    expect((await call(handler, { q: 'one more' }, '198.51.100.9')).statusCode).toBe(200)
  })

  test('/api/extsearch/surprise shares the "search" budget', async () => {
    for (let i = 0; i < 20; i++) await call(handler, { q: `q${i}` })
    expect((await call(surpriseHandler, {})).statusCode).toBe(429)
  })
})

describe('cache', () => {
  test('a repeat query is served from cache and says so', async () => {
    const first = await call(handler, { q: 'Small Web' })
    const second = await call(handler, { q: '  small   web ' })
    expect(first.body.meta.cacheHit).toBe(false)
    expect(second.body.meta.cacheHit).toBe(true)
    expect(second.body.results).toEqual(first.body.results)
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('page and filters are part of the key', async () => {
    await call(handler, { q: 'cats' })
    await call(handler, { q: 'cats', page: '1' })
    await call(handler, { q: 'cats', indie: 'true' })
    expect(run).toHaveBeenCalledTimes(3)
  })

  test('identical concurrent requests share one upstream call', async () => {
    const [a, b] = await Promise.all([cachedExtSearch({ q: 'x' }), cachedExtSearch({ q: 'x' })])
    expect(run).toHaveBeenCalledTimes(1)
    expect([a.meta.cacheHit, b.meta.cacheHit].sort()).toEqual([false, true])
  })

  test('entries expire after the TTL; partial results expire sooner; total failures are not cached', async () => {
    const now = jest.spyOn(Date, 'now')
    let t = 1_000_000
    now.mockImplementation(() => t)
    try {
      await cachedExtSearch({ q: 'full' })
      t += EXTSEARCH_CACHE_TTL_MS - 1
      expect((await cachedExtSearch({ q: 'full' })).meta.cacheHit).toBe(true)
      t += 2
      expect((await cachedExtSearch({ q: 'full' })).meta.cacheHit).toBe(false)

      run.mockImplementationOnce(async (q: any) => response(q.q, { partial: true }))
      await cachedExtSearch({ q: 'partial' })
      t += EXTSEARCH_PARTIAL_TTL_MS + 1
      expect((await cachedExtSearch({ q: 'partial' })).meta.cacheHit).toBe(false)

      run.mockImplementationOnce(async (q: any) => response(q.q, { ok: false, partial: true }))
      await cachedExtSearch({ q: 'down' })
      expect((await cachedExtSearch({ q: 'down' })).meta.cacheHit).toBe(false)
    } finally {
      now.mockRestore()
    }
  })

  test('the cache is bounded and evicts the least recently used entry', async () => {
    await cachedExtSearch({ q: 'keep-me' })
    for (let i = 0; i < EXTSEARCH_CACHE_MAX_ENTRIES - 1; i++) await cachedExtSearch({ q: `fill ${i}` })
    // touch keep-me so 'fill 0' is now the oldest
    expect((await cachedExtSearch({ q: 'keep-me' })).meta.cacheHit).toBe(true)
    await cachedExtSearch({ q: 'overflow' })
    expect(extSearchCacheSize()).toBe(EXTSEARCH_CACHE_MAX_ENTRIES)
    expect((await cachedExtSearch({ q: 'keep-me' })).meta.cacheHit).toBe(true)
    expect((await cachedExtSearch({ q: 'fill 0' })).meta.cacheHit).toBe(false)
  })
})

describe('input validation', () => {
  test.each<Record<string, string>>([{ page: 'abc' }, { page: '-1' }, { perPage: '0' }])('%j is a 400', async (q) => {
    const res = await call(handler, { q: 'cats', ...q })
    expect(res.statusCode).toBe(400)
    expect(run).not.toHaveBeenCalled()
  })
})
