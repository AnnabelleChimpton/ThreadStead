/**
 * /api/home/[handle]/visitors with the database mocked: the trail covers
 * the past week, and a POST goes to the trail or the quiet count depending
 * on who's visiting. tests/db/home-visitors.dbtest.ts runs the real queries.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const findManyArgs: any[] = []
let viewer: { id: string } | null = null
let trailsOn: boolean | null = true

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async () => ({ handle: 'owner', user: { id: 'u_owner', homeConfig: { userId: 'u_owner' } } })),
    },
    profile: {
      findUnique: jest.fn(async () => (trailsOn === null ? null : { showInVisitorTrails: trailsOn })),
    },
    pixelHomeVisitor: {
      findMany: jest.fn(async (args: any) => {
        findManyArgs.push(args)
        return [
          {
            visitedAt: new Date('2026-10-15T12:00:00Z'),
            visitor: {
              id: 'u_pal',
              handles: [{ handle: 'pal', host: 'threadstead.com' }],
              profile: { displayName: 'Pal', avatarUrl: null },
            },
          },
        ]
      }),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    pixelHomeVisitCount: {
      upsert: jest.fn(),
      deleteMany: jest.fn(async () => ({ count: 0 })),
      aggregate: jest.fn(async () => ({ _sum: { visits: 9 } })),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => viewer) }))
jest.mock('@/lib/domain/users/profile-access', () => ({
  residentAccess: jest.fn(async () => ({ visible: true })),
  sendPrivateProfile: jest.fn(),
  visibleResidentWhere: jest.fn(() => ({ visibleTo: 'viewer' })),
}))

import handler from '@/pages/api/home/[handle]/visitors'
import { db } from '@/lib/config/database/connection'
import { resetVisitMemory } from '@/lib/pixel-homes/visit-count'

async function call(method: 'GET' | 'POST') {
  const req = { method, query: { handle: 'owner' }, headers: {}, socket: { remoteAddress: '203.0.113.5' } } as unknown as NextApiRequest
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
  findManyArgs.length = 0
  viewer = null
  trailsOn = true
  resetVisitMemory()
  jest.clearAllMocks()
})

it('GET returns the last visitors of the past 7 days and the quiet count', async () => {
  const before = Date.now()
  const res = await call('GET')
  expect(res.statusCode).toBe(200)
  expect(res.body.visitors.map((v: any) => v.username)).toEqual(['pal'])
  expect(res.body.otherVisits).toBe(9)

  const since: Date = findManyArgs[0].where.visitedAt.gte
  const days = (before - since.getTime()) / (24 * 60 * 60 * 1000)
  expect(days).toBeCloseTo(7, 2)
  expect(findManyArgs[0].take).toBe(5)
})

it('GET only lists visitors who opted in, the viewer may see, and nobody blocked by or blocking the owner', async () => {
  await call('GET')
  expect(findManyArgs[0].where.visitor).toEqual({
    AND: [
      { OR: [{ profile: { is: null } }, { profile: { is: { showInVisitorTrails: true } } }] },
      { visibleTo: 'viewer' },
      { blocksCreated: { none: { blockedUserId: 'u_owner' } } },
      { blocksReceived: { none: { blockerId: 'u_owner' } } },
    ],
  })
})

it('POST signed out adds to the count and never to the trail', async () => {
  const res = await call('POST')
  expect(res.body.recorded).toBe('count')
  expect(db.pixelHomeVisitCount.upsert).toHaveBeenCalledTimes(1)
  expect(db.pixelHomeVisitor.upsert).not.toHaveBeenCalled()
})

it('POST signed in with trails on goes in the trail', async () => {
  viewer = { id: 'u_pal' }
  const res = await call('POST')
  expect(res.body.recorded).toBe('trail')
  expect(db.pixelHomeVisitor.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ where: { homeOwnerId_visitorId: { homeOwnerId: 'u_owner', visitorId: 'u_pal' } } })
  )
  expect(db.pixelHomeVisitCount.upsert).not.toHaveBeenCalled()
})

it('POST signed in with no profile row counts as trails on', async () => {
  viewer = { id: 'u_pal' }
  trailsOn = null
  expect((await call('POST')).body.recorded).toBe('trail')
})

it('POST signed in with trails off is only counted', async () => {
  viewer = { id: 'u_quiet' }
  trailsOn = false
  const res = await call('POST')
  expect(res.body.recorded).toBe('count')
  expect(db.pixelHomeVisitor.upsert).not.toHaveBeenCalled()
  expect(db.pixelHomeVisitCount.upsert).toHaveBeenCalledTimes(1)
})

it('POST by the owner records nothing', async () => {
  viewer = { id: 'u_owner' }
  const res = await call('POST')
  expect(res.body.recorded).toBe('none')
  expect(db.pixelHomeVisitor.upsert).not.toHaveBeenCalled()
  expect(db.pixelHomeVisitCount.upsert).not.toHaveBeenCalled()
})
