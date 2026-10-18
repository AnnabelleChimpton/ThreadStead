/**
 * GET /api/notifications adds the note's opening words to "X signed your
 * guestbook" rows, read live from the entry so deleted or hidden notes
 * don't linger in the bell.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    notification: { findMany: jest.fn() },
    guestbookEntry: { findMany: jest.fn() },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn().mockResolvedValue({ id: 'owner', role: 'member' }) }))

import handler from '@/pages/api/notifications'
import { db } from '@/lib/config/database/connection'

const actor = { id: 'a1', primaryHandle: 'pal@local', profile: { displayName: 'Pal', avatarUrl: null } }
const notif = (id: string, type: string, data: any) => ({
  id, type, status: 'unread', data, createdAt: new Date(), readAt: null, actor,
})

async function call() {
  const req = { method: 'GET', query: {}, headers: {} } as unknown as NextApiRequest
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

test('guestbook notifications carry a plain-text excerpt of a visible entry', async () => {
  ;(db.notification.findMany as jest.Mock).mockResolvedValue([
    notif('n1', 'guestbook', { guestbookEntryId: 'e1' }),
    notif('n2', 'guestbook', { guestbookEntryId: 'gone' }),
    notif('n3', 'follow', {}),
    notif('n4', 'guestbook', { guestbookEntryId: 'long' }),
  ])
  ;(db.guestbookEntry.findMany as jest.Mock).mockResolvedValue([
    { id: 'e1', message: 'Love the <b>hedges</b>!\n\nCome by sometime.' },
    { id: 'long', message: 'x'.repeat(300) },
  ])

  const res = await call()
  expect(res.statusCode).toBe(200)
  const byId = Object.fromEntries(res.body.notifications.map((n: any) => [n.id, n]))

  expect(byId.n1.data).toEqual({ guestbookEntryId: 'e1', excerpt: 'Love the hedges! Come by sometime.' })
  expect(byId.n2.data.excerpt).toBeNull()
  expect(byId.n3.data).toEqual({})
  expect(byId.n4.data.excerpt).toHaveLength(121)
  expect(byId.n4.data.excerpt.endsWith('…')).toBe(true)

  // Only this owner's visible entries are read
  const where = (db.guestbookEntry.findMany as jest.Mock).mock.calls[0][0].where
  expect(where).toEqual({ id: { in: ['e1', 'gone', 'long'] }, profileOwner: 'owner', status: 'visible' })
})

test('no guestbook notifications means no entry lookup', async () => {
  ;(db.guestbookEntry.findMany as jest.Mock).mockClear()
  ;(db.notification.findMany as jest.Mock).mockResolvedValue([notif('n3', 'follow', {})])
  await call()
  expect(db.guestbookEntry.findMany).not.toHaveBeenCalled()
})
