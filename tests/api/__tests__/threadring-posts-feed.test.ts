/**
 * GET /api/threadrings/[slug]/posts with hub PostRefs whose local post was
 * deleted (FUTURE_IMPROVEMENTS A3): the ref is skipped, the rest of the page
 * still renders, and the warning is logged once per post ID — not on every
 * render, which is what used to flood the production error log.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: { findUnique: jest.fn() },
    // getRestrictedUserIds: nobody suspended or banned
    user: { findMany: jest.fn(async () => []) },
    userBlock: { findMany: jest.fn(async () => []) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  getPublicRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))

import handler from '@/pages/api/threadrings/[slug]/posts'
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { resetMissingPostLog } from '@/lib/domain/threadrings/orphan-postrefs'
import { getSessionUser } from '@/lib/auth/server'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { RingHubAuthError } from '@/lib/api/ringhub/ringhub-errors'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'

const BASE = 'http://localhost:3000'
const livePost = {
  id: 'live1', title: 'Hello', bodyHtml: '<p>hi</p>', bodyMarkdown: 'hi', intent: null, visibility: 'public',
  createdAt: new Date(), updatedAt: new Date(), tags: [], isSpoiler: false, contentWarning: null, metadata: null,
  author: { id: 'u1', profile: { displayName: 'Alice', avatarUrl: null }, handles: [{ host: 'local', handle: 'alice' }] },
  threadRings: [],
}
const ref = (id: string, postId: string) => ({
  id, ringSlug: 'welcome', uri: `${BASE}/resident/alice/post/${postId}`, digest: 'd',
  submittedBy: 'did:web:x', submittedAt: '2026-05-01T00:00:00.000Z', isPinned: false, status: 'ACCEPTED', metadata: {},
})

async function call() {
  const req = { method: 'GET', query: { slug: 'welcome' }, headers: {} } as unknown as NextApiRequest
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

test('missing posts are skipped and logged once per id across renders', async () => {
  resetMissingPostLog()
  const getRingFeed = jest.fn().mockResolvedValue({ posts: [ref('r1', 'live1'), ref('r2', 'gone1'), ref('r3', 'gone2')], total: 3 })
  ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ getRingFeed })
  ;(db.post.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => (where.id === 'live1' ? livePost : null))
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

  const first = await call()
  await call()
  await call()

  expect(first.statusCode).toBe(200)
  expect(first.body.posts.map((p: any) => p.id)).toEqual(['live1'])
  const missingWarnings = warn.mock.calls.filter(([m]) => String(m).includes('deleted ThreadStead post'))
  expect(missingWarnings).toHaveLength(2)
  expect(missingWarnings.map(([m]) => String(m).match(/post=(\S+)/)![1])).toEqual(['gone1', 'gone2'])
  warn.mockRestore()
})

describe('a page of ring posts', () => {
  const prompt = (id: string) => ({ ...ref(id, 'x'), metadata: { type: 'threadring_prompt' } })

  beforeEach(() => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    ;(db.post.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => (where.id === 'live1' ? livePost : null))
  })

  test('carries what PostItem reads: the author profile, the PostRef id and pinned', async () => {
    const getRingFeed = jest.fn().mockResolvedValue({ posts: [{ ...ref('r1', 'live1'), pinned: true }], total: 1 })
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ getRingFeed })

    const { body } = await call()
    expect(body.posts[0]).toMatchObject({
      id: 'live1',
      author: { id: 'u1', profile: { displayName: 'Alice', avatarUrl: null } },
      ringHubPostId: 'r1',
      isPinned: true,
    })
  })

  test('a first page with nothing to show reads on, so a ring with posts never looks empty', async () => {
    const pages = [[prompt('p1'), prompt('p2')], [prompt('p3'), ref('r4', 'live1')]]
    const getRingFeed = jest.fn(async (_slug: string, { offset }: any) => ({ posts: pages[offset / 2] ?? [], total: 6 }))
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ getRingFeed })

    const req = { method: 'GET', query: { slug: 'welcome', limit: '2' }, headers: {} } as unknown as NextApiRequest
    const res: any = { statusCode: 200, status(c: number) { this.statusCode = c; return this }, json(b: any) { this.body = b; return this }, setHeader() {} }
    await handler(req, res as NextApiResponse)

    expect(res.body.posts.map((p: any) => p.id)).toEqual(['live1'])
    expect(res.body.nextOffset).toBe(4)
    expect(res.body.hasMore).toBe(true)
  })

  test('signed in, it reads as the viewer, and a key problem falls back to the unsigned read', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u2' })
    const getRingFeedAsMember = jest.fn().mockRejectedValue(new RingHubAuthError('stale key'))
    ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue({ getRingFeedAsMember })
    const getRingFeed = jest.fn().mockResolvedValue({ posts: [ref('r1', 'live1')], total: 1 })
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ getRingFeed })

    const { statusCode, body } = await call()
    expect(getRingFeedAsMember).toHaveBeenCalled()
    expect(statusCode).toBe(200)
    expect(body.posts.map((p: any) => p.id)).toEqual(['live1'])
  })

  test("the hub's 404 comes through as a 404, not a 500", async () => {
    const getRingFeed = jest.fn().mockRejectedValue(new RingHubClientError('Not found', 404))
    ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ getRingFeed })
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const { statusCode } = await call()
    expect(statusCode).toBe(404)
  })
})
