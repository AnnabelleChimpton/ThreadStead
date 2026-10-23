/**
 * GET /api/threadrings/[slug]/posts must not show a ring post to a viewer the
 * post's visibility excludes. The hub PostRef only says "this post is in the
 * ring"; who may read it is ThreadStead's rule (lib/domain/posts/visibility.ts).
 * Excluded posts leave no trace: no title, body or placeholder.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

type Follow = { followerId: string; followeeId: string; status: string }
const follows: Follow[] = [
  { followerId: 'fan', followeeId: 'alice', status: 'accepted' },   // follower only
  { followerId: 'pal', followeeId: 'alice', status: 'accepted' },   // mutual
  { followerId: 'alice', followeeId: 'pal', status: 'accepted' },
]

const VISIBILITIES = ['public', 'followers', 'friends', 'private']
const localPost = (visibility: string) => ({
  id: `p-${visibility}`, authorId: 'alice', title: `Title ${visibility}`, bodyHtml: `<p>body ${visibility}</p>`,
  bodyMarkdown: `body ${visibility}`, intent: null, visibility, createdAt: new Date(), updatedAt: new Date(), tags: [],
  isSpoiler: false, contentWarning: null, metadata: null,
  author: { id: 'alice', profile: { displayName: 'Alice', avatarUrl: null }, handles: [{ host: 'local', handle: 'alice' }] },
  threadRings: [],
})

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    // getRestrictedUserIds (lib/domain/users/moderation.ts): nobody suspended or banned
    user: { findMany: jest.fn(async () => []) },
    post: { findUnique: jest.fn(async ({ where }: any) => {
      const v = String(where.id).replace('p-', '')
      return VISIBILITIES.includes(v) ? localPost(v) : null
    }) },
    userBlock: { findMany: jest.fn(async () => []) },
    follow: { findUnique: jest.fn(async ({ where }: any) => {
      const { followerId, followeeId } = where.followerId_followeeId
      return follows.find((f) => f.followerId === followerId && f.followeeId === followeeId) ?? null
    }) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))

import handler from '@/pages/api/threadrings/[slug]/posts'
import { getSessionUser } from '@/lib/auth/server'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'

const BASE = 'http://localhost:3000'
const refs = VISIBILITIES.map((v, i) => ({
  id: `r${i}`, ringSlug: 'welcome', uri: `${BASE}/resident/alice/post/p-${v}`, digest: 'd',
  submittedBy: 'did:web:x', submittedAt: '2026-10-01T00:00:00.000Z', isPinned: false, status: 'ACCEPTED', metadata: {},
}))

beforeEach(() => {
  const getRingFeed = jest.fn().mockResolvedValue({ posts: refs, total: refs.length })
  ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ getRingFeed })
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue({ getRingFeedAsMember: getRingFeed })
})

async function viewAs(viewer: string | null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer } : null)
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

test.each([
  ['anonymous', null, ['public']],
  ['a stranger', 'stranger', ['public']],
  ['a follower', 'fan', ['public', 'followers']],
  ['a friend (mutual follow)', 'pal', ['public', 'followers', 'friends']],
  ['the author', 'alice', ['public', 'followers', 'friends', 'private']],
])('%s sees only what the post visibility allows', async (_label, viewer, expected) => {
  const res = await viewAs(viewer)
  expect(res.statusCode).toBe(200)
  expect(res.body.posts.map((p: any) => p.visibility)).toEqual(expected)

  // Hidden posts leave no trace in the response
  const raw = JSON.stringify(res.body)
  for (const v of VISIBILITIES.filter((v) => !expected.includes(v))) {
    expect(raw).not.toContain(`Title ${v}`)
    expect(raw).not.toContain(`body ${v}`)
    expect(raw).not.toContain(`p-${v}`)
  }

  // Counts drop what was hidden; paging still follows the hub's refs
  expect(res.body.total).toBe(expected.length)
  expect(res.body.nextOffset).toBe(refs.length)
  expect(res.body.hasMore).toBe(false)
})
