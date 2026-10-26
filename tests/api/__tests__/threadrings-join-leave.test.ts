/**
 * @jest-environment node
 *
 * Join and leave on apiHandler (api-consistency batch 6): the ring page
 * shows `error` as it comes, so it's a plain sentence, never the hub's
 * label or a `details` field. Leave's "not a member" was answered as
 * "ThreadRing not found", and a host's "Transfer ownership required".
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ ...jest.requireActual('@/lib/server/http/csrf'), csrfProtection: async () => true }))
jest.mock('@/lib/server/http/rate-limit', () => ({ ...jest.requireActual('@/lib/server/http/rate-limit'), rateLimitCheck: async () => true }))
jest.mock('@/lib/api/ringhub/forget-ring-reads', () => ({ forgetRingReads: jest.fn() }))
const joinRing = jest.fn()
const leaveRing = jest.fn()
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  AuthenticatedRingHubClient: jest.fn().mockImplementation(() => ({ joinRing, leaveRing })),
}))

import joinHandler from '@/pages/api/threadrings/[slug]/join'
import leaveHandler from '@/pages/api/threadrings/[slug]/leave'
import { getSessionUser } from '@/lib/auth/server'
import { AuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { forgetRingReads } from '@/lib/api/ringhub/forget-ring-reads'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'

async function call(handler: any) {
  const req = { method: 'POST', query: { slug: 'knits' }, headers: {}, body: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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

const hub = (status: number, error: string, message: string) => new RingHubClientError(error, status, undefined, { error, message })

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'me', role: 'member' })
})

test('a join, signed as the resident, clears their ring reads', async () => {
  joinRing.mockResolvedValue({ membership: {}, badge: { id: 'b1' } })
  const res = await call(joinHandler)
  expect(AuthenticatedRingHubClient).toHaveBeenCalledWith('me')
  expect(res.body).toEqual({ success: true, message: "You're in.", role: 'member', badgeId: 'b1' })
  expect(forgetRingReads).toHaveBeenCalledWith('knits', ['me'])
})

test("a hub failure is a plain sentence, with none of the hub's own text", async () => {
  joinRing.mockRejectedValue(hub(500, 'Internal error', 'Failed to process join request'))
  const res = await call(joinHandler)
  expect(res.statusCode).toBe(502)
  expect(res.body).toEqual({ error: "Couldn't join. Try again in a minute." })
})

test.each([
  [hub(404, 'Not a member', 'You are not a member of this ring'), 404, "You're not in this ring."],
  [hub(400, 'Transfer ownership required', 'Ring owners cannot leave until ownership is transferred to another member'), 400, 'As its host, hand the ring to another member before you leave.'],
])('leave: the hub\'s %s is said plainly', async (error, status, sentence) => {
  leaveRing.mockRejectedValue(error)
  const res = await call(leaveHandler)
  expect(res.statusCode).toBe(status)
  expect(res.body).toEqual({ error: sentence })
})

test('signed out: "Sign in first.", and nothing reaches the hub', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  for (const handler of [joinHandler, leaveHandler]) {
    const res = await call(handler)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Sign in first.' })
  }
  expect(AuthenticatedRingHubClient).not.toHaveBeenCalled()
})
