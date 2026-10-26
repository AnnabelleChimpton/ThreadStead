/**
 * @jest-environment node
 *
 * Rate limits on the guestbook and follows (subdomain-actions review):
 * reading a guestbook counts as a read, not against signing; signing has a
 * per-guestbook-per-person cap and a ceiling per guestbook; following has a
 * limit at all. A note is plain text of 2000 characters at most, as the
 * forms allow (any length went in before).
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const rateLimitCheck = jest.fn(async (..._args: unknown[]) => true)
const limitIdentifier = jest.fn(async (..._args: unknown[]) => true)
jest.mock('@/lib/server/http/rate-limit', () => ({
  rateLimitCheck: (...args: unknown[]) => rateLimitCheck(...args),
  limitIdentifier: (...args: unknown[]) => limitIdentifier(...args),
}))
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async () => ({ handle: 'alice', user: { id: 'owner-1' } })),
      findMany: jest.fn(async () => []),
    },
    guestbookEntry: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({ id: 'e1' })) },
    follow: { upsert: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({})) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'pat-1', role: 'member' })) }))
jest.mock('@/lib/domain/users/capabilities', () => ({ requireAction: () => async () => ({ sub: 'pat-1' }) }))
jest.mock('@/lib/domain/users/profile-access', () => ({ residentAccess: jest.fn(async () => ({ visible: true })), sendPrivateProfile: jest.fn() }))
jest.mock('@/lib/domain/notifications', () => ({
  createGuestbookNotification: jest.fn(),
  createFollowNotification: jest.fn(),
  createFriendNotification: jest.fn(),
  checkForMutualFollow: jest.fn(async () => false),
}))
jest.mock('@/lib/server/http/same-origin', () => ({ sameOriginProtection: () => true }))
jest.mock('@/lib/server/http/csrf', () => ({ ...jest.requireActual('@/lib/server/http/csrf'), csrfProtection: async () => true }))

import guestbook from '@/pages/api/guestbook/[username]'
import follow from '@/pages/api/follow/[username]'

function call(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>, method: string, body?: unknown) {
  const req = { method, query: { username: 'alice' }, headers: { 'x-csrf-token': 't', cookie: 'csrf_token=t; __Host-csrf_token=t', origin: 'http://localhost', host: 'localhost' }, body } as unknown as NextApiRequest
  const res = {
    statusCode: 200, body: undefined as unknown, headersSent: false,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; this.headersSent = true; return this },
    setHeader: jest.fn(),
  }
  return handler(req, res as unknown as NextApiResponse).then(() => res)
}

beforeEach(() => jest.clearAllMocks())

test('reading a guestbook counts as a read, not against signing', async () => {
  await call(guestbook, 'GET')
  expect(rateLimitCheck).toHaveBeenCalledTimes(1)
  expect((rateLimitCheck.mock.calls[0] as unknown[])[2]).toBe('reads')
  expect(limitIdentifier).not.toHaveBeenCalled()
})

test('signing counts against signing, the person-and-guestbook cap and the guestbook ceiling', async () => {
  const res = await call(guestbook, 'POST', { message: 'hi', cap: 'cap' })
  expect(res.statusCode).toBe(201)
  expect((rateLimitCheck.mock.calls[0] as unknown[])[2]).toBe('guestbook')
  expect(limitIdentifier.mock.calls.map((c) => (c as unknown[]).slice(1, 3))).toEqual([
    ['pat-1:owner-1', 'guestbook_pair'],
    ['owner-1', 'guestbook_target'],
  ])
})

test('over the cap, nothing is written and it says why', async () => {
  const { db } = jest.requireMock('@/lib/config/database/connection')
  limitIdentifier.mockImplementationOnce(async (...args: unknown[]) => {
    const [res, , , message] = args as [{ status: (n: number) => { json: (b: unknown) => void } }, string, string, () => string]
    res.status(429).json({ error: message() })
    return false
  })
  const res = await call(guestbook, 'POST', { message: 'hi', cap: 'cap' })
  expect(res.statusCode).toBe(429)
  expect(res.body).toEqual({ error: "You've signed alice's guestbook a few times today. Try again tomorrow." })
  expect(db.guestbookEntry.create).not.toHaveBeenCalled()
})

test.each([
  [{ message: 'x'.repeat(2001), cap: 'cap' }, 'Message is too long: 2000 characters at most.'],
  [{ message: '   ', cap: 'cap' }, 'Write a note first.'],
  [{ message: { text: 'hi' }, cap: 'cap' }, "Message isn't the right kind of value."],
])('%#: a note the forms wouldn\'t send is a 400 and nothing is written', async (body, error) => {
  const { db } = jest.requireMock('@/lib/config/database/connection')
  const res = await call(guestbook, 'POST', body)
  expect(res.statusCode).toBe(400)
  expect(res.body).toEqual({ error })
  expect(db.guestbookEntry.create).not.toHaveBeenCalled()
})

test('a note of 2000 characters goes in, trimmed', async () => {
  const { db } = jest.requireMock('@/lib/config/database/connection')
  const res = await call(guestbook, 'POST', { message: ` ${'x'.repeat(2000)} `, cap: 'cap' })
  expect(res.statusCode).toBe(201)
  expect(db.guestbookEntry.create.mock.calls[0][0].data.message).toBe('x'.repeat(2000))
})

test('following has a limit', async () => {
  await call(follow, 'POST')
  expect((rateLimitCheck.mock.calls[0] as unknown[])[2]).toBe('follows')
})
