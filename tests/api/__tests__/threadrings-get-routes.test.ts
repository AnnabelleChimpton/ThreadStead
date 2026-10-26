/**
 * The ring GET routes on apiHandler (api-consistency batch 6), against a
 * mocked hub:
 *  - my-memberships stops paging after 40 pages: a hub that kept saying
 *    "more" looped inside the request for good
 *  - genealogy is cached per viewer, like lineage (from the Spool it's the
 *    whole tree), and a maxDepth that isn't a number no longer turns the
 *    depth limit off
 *  - signed out, the 401 says "Sign in first."; other methods are a 405
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  getPublicRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))

import myMembershipsHandler from '@/pages/api/threadrings/my-memberships'
import genealogyHandler from '@/pages/api/threadrings/genealogy'
import statsHandler from '@/pages/api/threadrings/stats'
import { getSessionUser } from '@/lib/auth/server'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'

async function call(handler: any, query: Record<string, string> = {}, method = 'GET') {
  const req = { method, query, headers: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {} as Record<string, unknown>,
    status(code: number) { this.statusCode = code; return this },
    json(payload: any) { this.body = payload; return this },
    setHeader(k: string, v: unknown) { this.headers[k] = v; return this },
    end() { return this },
  }
  await handler(req, res as NextApiResponse)
  return res
}

/** A chain of rings six deep under the Spool */
function chain(depth: number): any {
  return depth === 0 ? { slug: 'leaf', name: 'leaf', children: [] } : { slug: `r${depth}`, name: `r${depth}`, children: [chain(depth - 1)] }
}
const depthOf = (node: any): number => (node.children?.length ? 1 + Math.max(...node.children.map(depthOf)) : 0)

const publicClient = {
  getRingLineage: jest.fn(async () => ({ ring: { slug: 'spool', name: 'The Spool' }, ancestors: [], descendants: [chain(6)] })),
  getStats: jest.fn(async () => ({ totalRings: 8, activeMemberships: 3, acceptedPosts: 2, totalActors: 3 })),
}

beforeEach(() => {
  jest.clearAllMocks()
  clearCache()
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  ;(getPublicRingHubClient as jest.Mock).mockReturnValue(publicClient)
})

describe('my-memberships', () => {
  test('signed out: 401, "Sign in first."', async () => {
    const res = await call(myMembershipsHandler)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Sign in first.' })
  })

  test('a hub that always says "more" is read 40 pages, not forever', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'me', role: 'member' })
    const getMyMemberships = jest.fn(async ({ offset }: { offset: number }) => ({
      memberships: Array.from({ length: 50 }, (_, i) => ({ ringSlug: `r-${offset + i}`, ringName: `R ${offset + i}`, role: 'member', ringVisibility: 'PUBLIC' })),
      hasMore: true,
    }))
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue({ getMyMemberships })
    const res = await call(myMembershipsHandler)
    expect(res.statusCode).toBe(200)
    expect(getMyMemberships).toHaveBeenCalledTimes(40)
    expect(res.body.rings).toHaveLength(2000)
  })
})

describe('genealogy', () => {
  test('a second view within the cache window reads nothing from the hub', async () => {
    await call(genealogyHandler, { maxDepth: '50' })
    const again = await call(genealogyHandler, { maxDepth: '50' })
    expect(again.statusCode).toBe(200)
    expect(publicClient.getRingLineage).toHaveBeenCalledTimes(1)
    expect(publicClient.getStats).toHaveBeenCalledTimes(1)
    expect(depthOf(again.body.tree)).toBe(7)
  })

  test('each viewer gets their own tree: a signed-in read is signed as them', async () => {
    const getRingLineageAsMember = jest.fn(async () => ({ ring: { slug: 'spool', name: 'The Spool' }, ancestors: [], descendants: [chain(1)] }))
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue({ getRingLineageAsMember })
    await call(genealogyHandler, { maxDepth: '50' })
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'me', role: 'member' })
    const mine = await call(genealogyHandler, { maxDepth: '50' })
    expect(getRingLineageAsMember).toHaveBeenCalledTimes(1)
    expect(depthOf(mine.body.tree)).toBe(2)
  })

  test.each([['abc', 3], ['2', 2], ['9999', 7]])('maxDepth=%s prunes to %i', async (maxDepth, depth) => {
    const res = await call(genealogyHandler, { maxDepth })
    expect(depthOf(res.body.tree)).toBe(depth)
  })
})

test('other methods are a 405 with the allowed one', async () => {
  const res = await call(statsHandler, {}, 'POST')
  expect(res.statusCode).toBe(405)
  expect(res.headers.Allow).toBeDefined()
})
