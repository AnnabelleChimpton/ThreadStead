/**
 * Pin, unpin and remove from the ring page's post menu go to the hub's
 * /curate with the PostRef id, signed as the resident, and the hub decides
 * who may. They used to check local ThreadRingMember rows (which nothing
 * writes any more, so hosts got "remove 403") and send this site's
 * post id, which the hub can't find.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    threadRing: { findMany: jest.fn(async () => [{ id: 'local-ring' }]), updateMany: jest.fn() },
    postThreadRing: { deleteMany: jest.fn(async () => ({ count: 1 })) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ ...jest.requireActual('@/lib/server/http/csrf'), csrfProtection: async () => true }))
jest.mock('@/lib/server/http/rate-limit', () => ({ ...jest.requireActual('@/lib/server/http/rate-limit'), rateLimitCheck: async () => true }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))
jest.mock('@/lib/api/ringhub/forget-ring-reads', () => ({ forgetRingReads: jest.fn() }))
jest.mock('@/lib/domain/threadrings/orphan-postrefs', () => ({
  isOurThreadSteadInstance: () => true,
  extractPostIdFromUri: (uri: string) => uri.split('/').pop(),
}))

import pinHandler from '@/pages/api/threadrings/[slug]/posts/[postId]/pin'
import removeHandler from '@/pages/api/threadrings/[slug]/posts/[postId]/remove'
import { getSessionUser } from '@/lib/auth/server'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { forgetRingReads } from '@/lib/api/ringhub/forget-ring-reads'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { db } from '@/lib/config/database/connection'

async function call(handler: any, method: string) {
  const req = { method, query: { slug: 'knits', postId: 'ref-1' }, headers: {}, body: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
  }
  await handler(req, res as NextApiResponse)
  return res
}

let curatePost: jest.Mock
beforeEach(() => {
  jest.clearAllMocks()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'host-1' })
  curatePost = jest.fn(async (_id: string, action: string) => ({
    post: { id: 'ref-1', uri: 'https://home.example/resident/a/post/p1', ringSlug: 'knits', pinned: action === 'pin' },
  }))
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue({ curatePost })
})

test('pin is the hub curate, signed as the resident, with the PostRef id', async () => {
  const res = await call(pinHandler, 'POST')
  expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('host-1')
  expect(curatePost).toHaveBeenCalledWith('ref-1', 'pin', undefined)
  expect(res.body).toEqual({ isPinned: true })
})

test('DELETE unpins', async () => {
  const res = await call(pinHandler, 'DELETE')
  expect(curatePost).toHaveBeenCalledWith('ref-1', 'unpin', undefined)
  expect(res.body).toEqual({ isPinned: false })
})

test("remove takes it out on the hub, forgets the ring's reads and drops the local mirror", async () => {
  const res = await call(removeHandler, 'DELETE')
  expect(curatePost).toHaveBeenCalledWith('ref-1', 'remove', undefined)
  expect(res.body).toEqual({ removed: true })
  expect(forgetRingReads).toHaveBeenCalledWith('knits')
  expect((db as any).postThreadRing.deleteMany).toHaveBeenCalledWith({ where: { postId: 'p1', threadRingId: 'local-ring' } })
})

test("the hub's refusal comes back as a plain 403", async () => {
  curatePost.mockRejectedValue(new RingHubClientError('Forbidden', 403, undefined, { message: 'You do not have permission' }))
  const res = await call(removeHandler, 'DELETE')
  expect(res.statusCode).toBe(403)
  expect(res.body.error).toMatch(/host and moderators/)
  expect(forgetRingReads).not.toHaveBeenCalled()
})

test('signed out is a 401 and never reaches the hub', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  const res = await call(pinHandler, 'POST')
  expect(res.statusCode).toBe(401)
  expect(curatePost).not.toHaveBeenCalled()
})
