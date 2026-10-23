/**
 * GET /api/search — RingHub client choice, ring links, blocked rings and
 * input validation, with the database mocked.
 *
 * People/posts/pages run raw SQL now; their matching, privacy, blocks,
 * ranking and paging are tested against real Postgres in
 * tests/db/search.dbtest.ts (`npm run test:db`). Here every SQL candidate
 * query returns no rows.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const state: {
  blocks: { blockerId: string; blockedUserId: string | null; blockedThreadRingId: string | null }[]
  rings: { id: string; slug: string }[]
} = { blocks: [], rings: [] }

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    $queryRaw: jest.fn(async () => []),
    user: { findMany: jest.fn(async () => []) },
    post: { findMany: jest.fn(async () => []) },
    customPage: { findMany: jest.fn(async () => []) },
    userBlock: {
      findMany: jest.fn(async ({ where }: any) => state.blocks.filter((b) => b.blockerId === where.blockerId)),
    },
    threadRing: {
      findMany: jest.fn(async ({ where }: any) => state.rings.filter((r) => where.id.in.includes(r.id))),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
const hubRings = [
  { id: 'hub-cats', slug: 'cats', name: 'Cats', description: 'cats!', memberCount: 3, postCount: 9 },
  { id: 'hub-catnip', slug: 'catnip', name: 'Catnip', description: null, memberCount: 1, postCount: 0 },
]
const publicClient = { listRings: jest.fn(async () => ({ rings: hubRings })) }
const userClient = { listRings: jest.fn(async () => ({ rings: hubRings })) }
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn(() => publicClient) }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(() => userClient),
}))

import handler from '@/pages/api/search'
import { getSessionUser } from '@/lib/auth/server'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'

async function call(query: Record<string, string>, viewer: string | null = null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  const req = { method: 'GET', query, headers: {} } as unknown as NextApiRequest
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
const ids = (res: any, type?: string) =>
  res.body.results.filter((r: any) => !type || r.type === type).map((r: any) => r.id)

beforeEach(() => {
  state.blocks = []
  state.rings = []
  jest.clearAllMocks()
  clearCache() // anonymous ring searches are cached for 60 s
})

describe('rings', () => {
  test('anonymous search uses the unsigned public client and links to /tr/:slug', async () => {
    const res = await call({ q: 'cat', type: 'threadrings' })
    expect(getPublicRingHubClient).toHaveBeenCalled()
    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalled()
    expect(res.body.results.map((r: any) => r.url).sort()).toEqual(['/tr/catnip', '/tr/cats'])
  })

  test('signed-in search uses the user-signed client', async () => {
    await call({ q: 'cat', type: 'threadrings' }, 'me')
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('me')
    expect(getPublicRingHubClient).not.toHaveBeenCalled()
  })

  test('a blocked ring (matched by its local slug) is left out', async () => {
    state.rings = [{ id: 'local-cats', slug: 'cats' }]
    state.blocks = [{ blockerId: 'me', blockedUserId: null, blockedThreadRingId: 'local-cats' }]
    expect(ids(await call({ q: 'cat', type: 'threadrings' }, 'me'))).toEqual(['hub-catnip'])
    expect(ids(await call({ q: 'cat', type: 'threadrings' }, 'someone-else')).sort()).toEqual(['hub-catnip', 'hub-cats'])
  })

  test('an exact name match ranks first and scores 100+', async () => {
    const res = await call({ q: 'catnip', type: 'threadrings' })
    expect(ids(res)[0]).toBe('hub-catnip')
    expect(res.body.results[0].relevanceScore).toBeGreaterThanOrEqual(100)
  })

  test('a search asks the hub for best matches (no sort); an older hub just ignores that', async () => {
    await call({ q: 'cat', type: 'threadrings' })
    expect(publicClient.listRings).toHaveBeenCalledWith({ search: 'cat', limit: 50 })
  })

  test('anonymous ring searches are cached for a minute, signed ones are not', async () => {
    await call({ q: 'cat', type: 'threadrings' })
    await call({ q: 'cat', type: 'threadrings' })
    expect(publicClient.listRings).toHaveBeenCalledTimes(1)
    await call({ q: 'cats', type: 'threadrings' })
    expect(publicClient.listRings).toHaveBeenCalledTimes(2)

    await call({ q: 'cat', type: 'threadrings' }, 'me')
    await call({ q: 'cat', type: 'threadrings' }, 'me')
    expect(userClient.listRings).toHaveBeenCalledTimes(2)
  })

  test("uses the hub's relevance signals when it sends them", async () => {
    // Estimated here, neither ring matches "kitties" and the tie goes to
    // hub-cats; the hub's scores say Felines, and the blend uses those.
    publicClient.listRings.mockResolvedValueOnce({
      rings: [
        { ...hubRings[0], name: 'Cats', relevance: { textRank: 0, trigram: 0.1 } },
        { id: 'hub-felines', slug: 'felines', name: 'Felines', description: 'all about cats', memberCount: 1, postCount: 0, relevance: { textRank: 1, trigram: 0.3 } },
      ],
    } as any)
    const res = await call({ q: 'kitties', type: 'threadrings' })
    expect(ids(res)).toEqual(['hub-felines', 'hub-cats'])
  })

  test('a hub failure is reported as partial, not as "no results"', async () => {
    publicClient.listRings.mockRejectedValueOnce(new Error('hub down'))
    const res = await call({ q: 'cat', type: 'threadrings' })
    expect(res.statusCode).toBe(200)
    expect(res.body.partial).toBe(true)
    expect(res.body.errors).toEqual([{ source: 'threadrings', message: 'hub down' }])
  })
})

describe('input validation', () => {
  test.each(['abc', '-1', '0', '1.5', '10abc'])('limit=%s is a 400', async (limit) => {
    const res = await call({ q: 'x', limit })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/limit/)
  })

  test('an unknown type is a 400', async () => {
    expect((await call({ q: 'x', type: 'threadring' })).statusCode).toBe(400)
  })

  test('pages is a valid type', async () => {
    expect((await call({ q: 'x', type: 'pages' })).statusCode).toBe(200)
  })

  test('a bad cursor is a 400', async () => {
    const res = await call({ q: 'x', cursor: 'not-a-cursor' })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/cursor/)
  })

  test('an empty query returns no results without touching the database', async () => {
    const { db } = jest.requireMock('@/lib/config/database/connection')
    const res = await call({ q: '   ' })
    expect(res.body.results).toEqual([])
    expect(db.$queryRaw).not.toHaveBeenCalled()
  })
})
