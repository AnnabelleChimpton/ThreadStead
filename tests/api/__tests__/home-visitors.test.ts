/**
 * /api/home/[handle]/visitors — the trail shows the past week, not the past
 * day, and a signed-out POST is refused (the client no longer sends one).
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const findManyArgs: any[] = []

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async () => ({ handle: 'owner', user: { id: 'u_owner' } })),
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
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => null) }))
jest.mock('@/lib/domain/users/profile-access', () => ({
  residentAccess: jest.fn(async () => ({ visible: true, visibility: 'public', blocked: false })),
  sendPrivateProfile: jest.fn(),
}))

import handler from '@/pages/api/home/[handle]/visitors'
import { db } from '@/lib/config/database/connection'

async function call(method: 'GET' | 'POST') {
  const req = { method, query: { handle: 'owner' }, headers: {} } as unknown as NextApiRequest
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
  jest.clearAllMocks()
})

it('GET returns the last visitors of the past 7 days', async () => {
  const before = Date.now()
  const res = await call('GET')
  expect(res.statusCode).toBe(200)
  expect(res.body.visitors.map((v: any) => v.username)).toEqual(['pal'])

  const since: Date = findManyArgs[0].where.visitedAt.gte
  const days = (before - since.getTime()) / (24 * 60 * 60 * 1000)
  expect(days).toBeCloseTo(7, 2)
  expect(findManyArgs[0].take).toBe(5)
})

it('POST signed out is refused and records nothing', async () => {
  const res = await call('POST')
  expect(res.statusCode).toBe(401)
  expect(db.pixelHomeVisitor.create).not.toHaveBeenCalled()
  expect(db.pixelHomeVisitor.update).not.toHaveBeenCalled()
})
