/**
 * Websites (the blogroll) keep web addresses only. A crafted save stored a
 * javascript: or data: link on the page; Settings now says the same up front.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    profile: {
      findUnique: jest.fn(async () => ({ visibility: 'public' })),
      upsert: jest.fn(async () => ({})),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'u1' })) }))
jest.mock('@/lib/domain/users/capabilities', () => ({ requireAction: () => async () => ({ sub: 'u1' }) }))
jest.mock('@/lib/server/http/csrf', () => ({ withCsrfProtection: (h: unknown) => h }))
jest.mock('@/lib/server/http/rate-limit', () => ({ withRateLimit: () => (h: unknown) => h }))
jest.mock('@/lib/api/ringhub/ringhub-profile-sync', () => ({ notifyRingHubIfMember: jest.fn(async () => {}) }))
jest.mock('@/lib/pixel-homes/snapshot/service', () => ({ scheduleHomeSnapshot: jest.fn(async () => null) }))

import handler from '@/pages/api/profile/update'
import { db } from '@/lib/config/database/connection'

async function saveBlogroll(blogroll: unknown[]) {
  const req = { method: 'POST', body: { cap: 'c', blogroll }, headers: {} } as unknown as NextApiRequest
  const res = { statusCode: 200, status(code: number) { this.statusCode = code; return this }, json() { return this } }
  await handler(req, res as unknown as NextApiResponse)
  const upsert = (db.profile.upsert as jest.Mock).mock.calls[0][0]
  return upsert.update.blogroll as Array<{ label: string; url: string }>
}

beforeEach(() => jest.clearAllMocks())

test('web addresses are kept, trimmed', async () => {
  expect(await saveBlogroll([
    { id: '1', label: 'Mine', url: ' https://example.com ' },
    { id: '2', label: 'Theirs', url: 'http://example.org/blog' },
  ])).toEqual([
    { id: '1', label: 'Mine', url: 'https://example.com', blurb: '' },
    { id: '2', label: 'Theirs', url: 'http://example.org/blog', blurb: '' },
  ])
})

test('other kinds of link are dropped', async () => {
  expect(await saveBlogroll([
    { id: '1', label: 'a', url: 'javascript:void(0)' },
    { id: '2', label: 'b', url: 'data:text/html,hi' },
    { id: '3', label: 'c', url: 'example.com' },
    { id: '4', label: 'd', url: `https://example.com/${'a'.repeat(600)}` },
  ])).toEqual([])
})
