/**
 * @jest-environment node
 *
 * Starting a ring from another (fork), on apiHandler (api-consistency batch
 * 6), against a mocked hub and badge upload (nothing reaches R2):
 *  - the hub gets what ForkThreadRingForm sends, and the badge drawn here;
 *    badge image addresses in the body are ignored (they went to the hub
 *    as they came)
 *  - a body the form wouldn't send is a 400, not a 500 from .trim()
 *  - the hub's refusals are plain sentences; its 429 passes through for
 *    the form to read
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ ...jest.requireActual('@/lib/server/http/csrf'), csrfProtection: async () => true }))
jest.mock('@/lib/server/http/rate-limit', () => ({ ...jest.requireActual('@/lib/server/http/rate-limit'), rateLimitCheck: async () => true }))
jest.mock('@/lib/api/ringhub/forget-ring-reads', () => ({ forgetRingReads: jest.fn() }))
jest.mock('@/lib/rings/badge', () => ({
  ...jest.requireActual('@/lib/rings/badge'),
  drawAndUploadRingBadge: jest.fn(async () => ({ badgeImageUrl: 'https://cdn.test/badge.png', badgeImageHighResUrl: 'https://cdn.test/badge@4x.png' })),
}))
const forkRing = jest.fn()
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  AuthenticatedRingHubClient: jest.fn().mockImplementation(() => ({ forkRing })),
}))

import forkHandler from '@/pages/api/threadrings/[slug]/fork'
import { getSessionUser } from '@/lib/auth/server'
import { drawAndUploadRingBadge } from '@/lib/rings/badge'
import { AuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'

async function fork(body: unknown) {
  const req = { method: 'POST', query: { slug: 'knits' }, headers: {}, body, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
  }
  await forkHandler(req, res as NextApiResponse)
  return res
}

/** What ForkThreadRingForm sends */
const form = { name: 'Sock Knits', slug: 'sock-knits', description: ' Socks only ', joinType: 'invite', visibility: 'unlisted', badge: { template: 'label', glyph: 'rings' } }

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'me', role: 'member' })
  forkRing.mockImplementation(async (_parent: string, data: any) => ({ ...data, uri: `https://hub.test/rings/${data.slug}` }))
})

test("the hub gets the form's ring, the badge drawn here, and none from the body", async () => {
  const res = await fork({ ...form, badgeImageUrl: 'http://tracker.example/pixel.gif', badgeImageHighResUrl: 'javascript:alert(1)' })
  expect(res.statusCode).toBe(200)
  expect(AuthenticatedRingHubClient).toHaveBeenCalledWith('me')
  expect(forkRing).toHaveBeenCalledWith('knits', {
    name: 'Sock Knits',
    slug: 'sock-knits',
    description: 'Socks only',
    joinPolicy: 'INVITATION',
    visibility: 'UNLISTED',
    postPolicy: 'MEMBERS',
    badgeImageUrl: 'https://cdn.test/badge.png',
    badgeImageHighResUrl: 'https://cdn.test/badge@4x.png',
  })
  expect(res.body.message).toBe('"Sock Knits" is ready.')
})

test.each([
  [{ ...form, description: { x: 1 } }, "Description isn't the right kind of value."],
  [{ ...form, joinType: 'whenever' }, "Join type isn't one of the choices."],
  [{ ...form, name: '  ' }, 'Give the ring a name.'],
  [{ ...form, slug: 'sock--knits' }, "A ring's address is 3 to 25 lowercase letters, numbers and single hyphens."],
])('%#: a ring the form wouldn\'t send is a 400, and nothing is drawn or sent', async (body, error) => {
  const res = await fork(body)
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe(error)
  expect(drawAndUploadRingBadge).not.toHaveBeenCalled()
  expect(forkRing).not.toHaveBeenCalled()
})

test.each([
  [new RingHubClientError('Slug unavailable', 400, undefined, { error: 'Slug unavailable', message: "Ring slug 'sock-knits' is already taken" }), 400, 'That address is taken. Try another.'],
  [new RingHubClientError('Not found', 404, undefined, { error: 'Not found', message: 'Parent ring not found' }), 404, "We couldn't find the ring you're branching from."],
  [new RingHubClientError('Internal error', 500, undefined, { error: 'Internal error', message: 'Failed to fork ring' }), 502, "Couldn't start the ring. Try again in a minute."],
])("the hub's %s is said plainly, with none of its own text", async (error, status, sentence) => {
  forkRing.mockRejectedValue(error)
  const res = await fork(form)
  expect(res.statusCode).toBe(status)
  expect(res.body).toEqual({ error: sentence })
})

test("the hub's 429 passes through, for the form to say which limit", async () => {
  const limited = { error: 'Rate limit exceeded', message: 'Fork rate limit exceeded.', details: { action: 'fork_ring', errorType: 'rate_limit', remaining: { hourly: 0, daily: 2 } } }
  forkRing.mockRejectedValue(new RingHubClientError('Rate limit exceeded', 429, undefined, limited))
  const res = await fork(form)
  expect(res.statusCode).toBe(429)
  expect(res.body).toEqual(limited)
})

test('signed out: "Sign in first.", nothing drawn or sent', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  const res = await fork(form)
  expect(res.statusCode).toBe(401)
  expect(res.body).toEqual({ error: 'Sign in first.' })
  expect(drawAndUploadRingBadge).not.toHaveBeenCalled()
})
