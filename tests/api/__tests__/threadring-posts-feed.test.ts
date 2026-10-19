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
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getRingHubClient: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))

import handler from '@/pages/api/threadrings/[slug]/posts'
import { db } from '@/lib/config/database/connection'
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { resetMissingPostLog } from '@/lib/domain/threadrings/orphan-postrefs'

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
  ;(getRingHubClient as jest.Mock).mockReturnValue({ getRingFeed })
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
