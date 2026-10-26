/**
 * /api/notifications takes real statuses only. A made-up ?status, or one
 * sent twice, and a PATCH status that isn't one, went to Prisma as a 500;
 * the ids to mark had no type or count.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    notification: { findMany: jest.fn(async () => []), updateMany: jest.fn(async () => ({ count: 0 })) },
    guestbookEntry: { findMany: jest.fn(async () => []) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn().mockResolvedValue({ id: 'me', role: 'member' }) }))
jest.mock('@/lib/domain/users/blocks', () => ({ getHiddenIds: async () => ({ blockedUserIds: [], blockedThreadRingIds: [] }) }))
jest.mock('@/lib/server/http/csrf', () => ({ ...jest.requireActual('@/lib/server/http/csrf'), csrfProtection: async () => true }))
jest.mock('@/lib/server/http/rate-limit', () => ({ ...jest.requireActual('@/lib/server/http/rate-limit'), rateLimitCheck: async () => true }))

import handler from '@/pages/api/notifications'
import { db } from '@/lib/config/database/connection'

async function call(method: string, query: Record<string, unknown> = {}, body?: unknown) {
  const req = { method, query, body, headers: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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

beforeEach(() => jest.clearAllMocks())

test.each([['unread'], ['all'], [undefined]])('?status=%s lists', async (status) => {
  expect((await call('GET', status ? { status } : {})).statusCode).toBe(200)
})

test.each([['nonsense'], [['unread', 'read']]])('?status=%j is a 400', async (status) => {
  const res = await call('GET', { status })
  expect(res.statusCode).toBe(400)
  expect(db.notification.findMany).not.toHaveBeenCalled()
})

test('marking read: only your own, with the time', async () => {
  const res = await call('PATCH', {}, { notificationIds: ['n1', 'n2'], status: 'read' })
  expect(res.statusCode).toBe(200)
  const args = (db.notification.updateMany as jest.Mock).mock.calls[0][0]
  expect(args.where).toEqual({ id: { in: ['n1', 'n2'] }, recipientId: 'me' })
  expect(args.data).toEqual({ status: 'read', readAt: expect.any(Date) })
})

test.each([
  [{ notificationIds: ['n1'], status: 'seen' }],
  [{ notificationIds: [{ not: 'x' }], status: 'read' }],
  [{ notificationIds: Array.from({ length: 101 }, (_, i) => `n${i}`), status: 'read' }],
  [{ status: 'read' }],
])('%#: a PATCH the bell wouldn\'t send is a 400 and changes nothing', async (body) => {
  const res = await call('PATCH', {}, body)
  expect(res.statusCode).toBe(400)
  expect(db.notification.updateMany).not.toHaveBeenCalled()
})

test('mark all read still takes no body', async () => {
  expect((await call('POST')).statusCode).toBe(200)
  expect(db.notification.updateMany).toHaveBeenCalledTimes(1)
})
