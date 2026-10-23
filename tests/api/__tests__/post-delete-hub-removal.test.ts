/**
 * Route tests (mocked hub clients) for removing a deleted post's hub PostRefs.
 *
 * The hub's POST /trp/curate looks PostRefs up by PostRef id and only lets the
 * author (actorDid / submittedBy) or a ring moderator act on them. Admin
 * deletion used to send the LOCAL post id signed as the server DID, so it
 * always 404'd and left orphaned PostRefs. Both routes now go through
 * removePostFromRingHub: stored PostRef id (or URI fallback), signed as the
 * post's author, and a hub failure never blocks local deletion.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: { findUnique: jest.fn(), delete: jest.fn() },
    threadRing: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({
  csrfProtection: jest.fn().mockResolvedValue(true),
  withCsrfProtection: (h: any) => h,
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  rateLimitCheck: jest.fn().mockResolvedValue(true),
  withRateLimit: () => (h: any) => h,
}))
jest.mock('@/lib/domain/users/capabilities', () => ({
  requireAction: () => async () => ({ ok: true }),
}))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  getRingHubClient: jest.fn(() => {
    throw new Error('server-signed client must not be used for post removal')
  }),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))

import adminDeleteHandler from '@/pages/api/admin/delete-post'
import authorDeleteHandler from '@/pages/api/posts/delete'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { buildPostUri } from '@/lib/domain/posts/ringhub-metadata'

const mockDb = db as any

function makeReqRes(method: string, body: any) {
  const req = { method, query: {}, body, headers: {}, url: '/api/test' } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.jsonBody = payload
      return this
    },
    setHeader: jest.fn(),
  }
  return { req, res: res as NextApiResponse & { statusCode: number; jsonBody: any } }
}

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'local-post-1',
    authorId: 'author-1',
    author: { id: 'author-1', primaryHandle: 'pat@homepageagain', profile: { displayName: 'Pat' } },
    threadRingPostIds: { 'ring-a': 'hub-ref-a', 'ring-b': 'hub-ref-b' },
    threadRings: [
      { threadRing: { id: 'tr-a', slug: 'ring-a', name: 'Ring A' } },
      { threadRing: { id: 'tr-b', slug: 'ring-b', name: 'Ring B' } },
    ],
    ...overrides,
  }
}

function curateOk(...slugs: string[]) {
  return {
    post: { id: 'x', status: 'REMOVED' },
    action: 'remove',
    moderator: 'author',
    moderatedAt: '2026-10-17T00:00:00Z',
    globalRemoval: true,
    affectedRings: slugs.map((slug) => ({ id: `id-${slug}`, slug })),
  }
}

let hub: { curatePost: jest.Mock; getRingFeed: jest.Mock }

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  hub = { curatePost: jest.fn(), getRingFeed: jest.fn() }
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)
  mockDb.post.delete.mockResolvedValue({})
  mockDb.$transaction.mockResolvedValue([])
})

describe('DELETE /api/admin/delete-post', () => {
  beforeEach(() => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'admin', primaryHandle: 'mod' })
  })

  test('removes by the stored PostRef id, signed as the AUTHOR, once for a global removal', async () => {
    mockDb.post.findUnique.mockResolvedValue(makePost())
    hub.curatePost.mockResolvedValue(curateOk('ring-a', 'ring-b'))

    const { req, res } = makeReqRes('DELETE', { postId: 'local-post-1' })
    await adminDeleteHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('author-1')
    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalledWith('admin-1')
    // The hub PostRef id, never the local post id; ring-b was covered globally.
    expect(hub.curatePost).toHaveBeenCalledTimes(1)
    expect(hub.curatePost).toHaveBeenCalledWith('hub-ref-a', 'remove', {
      reason: 'Post deleted by admin: mod',
    })
    expect(mockDb.post.delete).toHaveBeenCalledWith({ where: { id: 'local-post-1' } })
    expect(res.jsonBody).toMatchObject({ success: true, ringHubSynced: true })
  })

  test('falls back to matching the canonical URI in the ring feed, across pages', async () => {
    mockDb.post.findUnique.mockResolvedValue(
      makePost({
        threadRingPostIds: null,
        threadRings: [{ threadRing: { id: 'tr-a', slug: 'ring-a', name: 'Ring A' } }],
      })
    )
    const uri = buildPostUri('pat@homepageagain', 'local-post-1')
    const filler = Array.from({ length: 100 }, (_, i) => ({ id: `other-${i}`, uri: `${uri}-x${i}` }))
    hub.getRingFeed
      .mockResolvedValueOnce({ posts: filler, total: 101 })
      .mockResolvedValueOnce({ posts: [{ id: 'hub-ref-old', uri }], total: 101 })
    hub.curatePost.mockResolvedValue(curateOk('ring-a'))

    const { req, res } = makeReqRes('DELETE', { postId: 'local-post-1' })
    await adminDeleteHandler(req, res)

    expect(hub.getRingFeed).toHaveBeenNthCalledWith(2, 'ring-a', { limit: 100, offset: 100 })
    expect(hub.curatePost).toHaveBeenCalledWith('hub-ref-old', 'remove', expect.any(Object))
    expect(res.jsonBody.ringHubSynced).toBe(true)
  })

  test('tries the next ring when one ref fails, and still deletes locally', async () => {
    mockDb.post.findUnique.mockResolvedValue(makePost())
    hub.curatePost
      .mockRejectedValueOnce(Object.assign(new Error('Post not found'), { status: 404 }))
      .mockResolvedValueOnce(curateOk('ring-b'))

    const { req, res } = makeReqRes('DELETE', { postId: 'local-post-1' })
    await adminDeleteHandler(req, res)

    expect(hub.curatePost.mock.calls.map((c) => c[0])).toEqual(['hub-ref-a', 'hub-ref-b'])
    expect(mockDb.post.delete).toHaveBeenCalled()
    expect(res.jsonBody).toMatchObject({ success: true, ringHubSynced: true })
  })

  test('a hub outage never blocks local deletion', async () => {
    mockDb.post.findUnique.mockResolvedValue(makePost())
    hub.curatePost.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }))

    const { req, res } = makeReqRes('DELETE', { postId: 'local-post-1' })
    await adminDeleteHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mockDb.post.delete).toHaveBeenCalledWith({ where: { id: 'local-post-1' } })
    expect(res.jsonBody).toMatchObject({ success: true, ringHubSynced: false })
  })

  test('posts in no rings never touch the hub', async () => {
    mockDb.post.findUnique.mockResolvedValue(makePost({ threadRings: [] }))
    await adminDeleteHandler(...Object.values(makeReqRes('DELETE', { postId: 'local-post-1' })) as [any, any])

    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalled()
    expect(mockDb.post.delete).toHaveBeenCalledTimes(1)
  })

  test('non-admins are refused before anything is touched', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'user-9', role: 'member' })
    const { req, res } = makeReqRes('DELETE', { postId: 'local-post-1' })
    await adminDeleteHandler(req, res)

    expect(res.statusCode).toBe(403)
    expect(mockDb.post.findUnique).not.toHaveBeenCalled()
    expect(hub.curatePost).not.toHaveBeenCalled()
  })
})

describe('POST /api/posts/delete (author)', () => {
  test('uses the same shared removal: stored PostRef id, signed as the author', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'author-1' })
    mockDb.post.findUnique.mockResolvedValue(makePost())
    hub.curatePost.mockResolvedValue(curateOk('ring-a', 'ring-b'))

    const { req, res } = makeReqRes('POST', { id: 'local-post-1', cap: 'cap-token' })
    await authorDeleteHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('author-1')
    expect(hub.curatePost).toHaveBeenCalledTimes(1)
    expect(hub.curatePost).toHaveBeenCalledWith('hub-ref-a', 'remove', {
      reason: 'Author removed their own content',
    })
    expect(mockDb.$transaction).toHaveBeenCalled()
    expect(res.jsonBody).toMatchObject({ ok: true, ringHubSynced: true, affectedRings: ['ring-a', 'ring-b'] })
  })
})
