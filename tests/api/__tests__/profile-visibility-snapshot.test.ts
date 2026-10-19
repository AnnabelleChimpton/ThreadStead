/**
 * Changing profile visibility refreshes the pixel home's share snapshot
 * (only public homes have one), after answering.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

let currentVisibility: string | null = 'public'
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    profile: {
      findUnique: jest.fn(async () => (currentVisibility === null ? null : { visibility: currentVisibility })),
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
import { scheduleHomeSnapshot } from '@/lib/pixel-homes/snapshot/service'

async function update(body: Record<string, unknown>) {
  const req = { method: 'POST', body: { cap: 'c', ...body }, headers: {} } as unknown as NextApiRequest
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json() {
      return this
    },
  }
  await handler(req, res as unknown as NextApiResponse)
  return res
}

beforeEach(() => jest.clearAllMocks())

test.each([
  ['public', 'private'],
  ['private', 'public'],
  ['followers', 'public'],
  [null, 'friends'], // no profile row yet: that was public
])('%s → %s refreshes the snapshot', async (from, to) => {
  currentVisibility = from
  expect((await update({ visibility: to })).statusCode).toBe(200)
  expect(scheduleHomeSnapshot).toHaveBeenCalledWith('u1')
})

test.each([
  ['public', 'public'],
  ['private', 'private'],
  [null, 'public'],
])('%s → %s leaves it alone', async (from, to) => {
  currentVisibility = from
  await update({ visibility: to })
  expect(scheduleHomeSnapshot).not.toHaveBeenCalled()
})

test('other profile edits leave it alone', async () => {
  currentVisibility = 'public'
  await update({ bio: 'hello' })
  expect(scheduleHomeSnapshot).not.toHaveBeenCalled()
})
