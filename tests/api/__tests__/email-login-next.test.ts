/**
 * @jest-environment node
 *
 * Email login carries ?next= into the emailed link, so someone signing a
 * guestbook from a friend's address comes back to it, but only ever a path
 * on this site.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const sendLoginEmail = jest.fn(async () => {})
jest.mock('@/lib/email-login', () => ({
  createEmailLoginToken: jest.fn(async () => 'tok'),
  sendLoginEmail: (...a: unknown[]) => sendLoginEmail(...(a as [])),
  cleanupExpiredTokens: jest.fn(async () => {}),
}))
jest.mock('@/lib/utils/security/email-encryption', () => ({
  findUsersByEmail: jest.fn(async () => [{ id: 'u1', primaryHandle: 'pat@HomePageAgain', emailVerifiedAt: new Date(), handles: [{ handle: 'pat', host: 'HomePageAgain' }], profile: { displayName: 'Pat' } }]),
}))
jest.mock('@/lib/server/http/rate-limit', () => ({ emailSendLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/same-origin', () => ({ sameOriginProtection: () => true }))
jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => 'https://homepageagain.com' }))

import handler from '@/pages/api/auth/email-login'

async function send(next?: string) {
  const req = { method: 'POST', headers: {}, query: {}, body: { email: 'pat@example.com', username: 'pat', ...(next !== undefined && { next }) } } as unknown as NextApiRequest
  const res = { statusCode: 200, headersSent: false, status(c: number) { this.statusCode = c; return this }, json() { this.headersSent = true; return this }, setHeader: jest.fn() }
  await handler(req, res as unknown as NextApiResponse)
  return res
}

beforeEach(() => sendLoginEmail.mockClear())

test('a path here goes into the link; another site, or nothing, does not', async () => {
  await send('/act/guestbook/alice')
  await send('/\t/evil.com')
  await send()
  const nexts = sendLoginEmail.mock.calls.map((c) => (c as unknown[])[3] ?? null)
  expect(nexts).toEqual(['/act/guestbook/alice', null, null])
})
