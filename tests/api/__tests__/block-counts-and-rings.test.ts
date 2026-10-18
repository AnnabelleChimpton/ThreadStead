/**
 * Blocking also reaches comment counts, ring feeds and the profile Blog tab:
 * counts leave out a blocked person's comments (and the replies under them),
 * ring feeds leave out their posts and activity, and their profile says
 * they're blocked instead of looking empty.
 *
 * Like block-filtering.test.ts, the db mock evaluates the Prisma `where`
 * each route builds against in-memory rows.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

type Comment = { id: string; postId: string; authorId: string; parentId: string | null; status: string; createdAt: Date }
type Post = { id: string; authorId: string; visibility: string; createdAt: Date }
type Block = { blockerId: string; blockedUserId: string | null; blockedThreadRingId: string | null }
type User = { id: string; did: string; originalDid: string | null; signingDid: string | null }

const state: { posts: Post[]; comments: Comment[]; blocks: Block[]; users: User[] } = {
  posts: [],
  comments: [],
  blocks: [],
  users: [],
}
const queries = { comment: 0 }

// --- a tiny evaluator for the subset of Prisma filters the routes use ---
function matchScalar(value: any, cond: any): boolean {
  if (cond === undefined) return true
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) return value === cond
  if ('in' in cond && !cond.in.includes(value)) return false
  if ('notIn' in cond && cond.notIn.includes(value)) return false
  return true
}
function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([key, cond]: [string, any]) => {
    if (key === 'AND') return cond.every((w: any) => matches(row, w))
    if (key === 'OR') return cond.some((w: any) => matches(row, w))
    if (key === 'threadRings') return true // no ring blocks in these tests
    return matchScalar(row[key], cond)
  })
}
const visibleCount = (postId: string) =>
  state.comments.filter((c) => c.postId === postId && c.status === 'visible').length
const handleOf = (userId: string) => ({ handle: userId, host: 'local' })

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userBlock: {
      findMany: jest.fn(async ({ where }: any) => state.blocks.filter((b) => b.blockerId === where.blockerId)),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) =>
        state.users
          .filter((u) => matches(u, where))
          .map((u) => ({ did: u.did, originalDid: u.originalDid, userDID: u.signingDid ? { did: u.signingDid } : null }))
      ),
    },
    handle: {
      findFirst: jest.fn(async ({ where }: any) =>
        state.users.some((u) => u.id === where.handle) ? { handle: where.handle, user: { id: where.handle } } : null
      ),
    },
    comment: {
      findMany: jest.fn(async ({ where }: any) => {
        queries.comment++
        return state.comments.filter((c) => matches(c, where)).map(({ id, postId, status }) => ({ id, postId, status }))
      }),
      count: jest.fn(async ({ where }: any) => state.comments.filter((c) => matches(c, where)).length),
      groupBy: jest.fn(async ({ where }: any) => {
        const counts = new Map<string, number>()
        for (const c of state.comments.filter((c) => matches(c, where))) counts.set(c.postId, (counts.get(c.postId) ?? 0) + 1)
        return [...counts].map(([postId, n]) => ({ postId, _count: { _all: n } }))
      }),
    },
    post: {
      findUnique: jest.fn(async ({ where }: any) => {
        const p = state.posts.find((p) => p.id === where.id)
        return p
          ? { ...p, title: p.id, tags: [], threadRings: [], author: { id: p.authorId, handles: [handleOf(p.authorId)], profile: null } }
          : null
      }),
      findMany: jest.fn(async ({ where, select, take = Infinity }: any) => {
        const rows = state.posts
          .filter((p) => matches(p, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, take)
        if (select) return rows.map((p) => ({ id: p.id }))
        return rows.map((p) => ({
          ...p,
          title: p.id,
          author: { handles: [handleOf(p.authorId)], profile: null },
          threadRings: [],
          _count: { comments: visibleCount(p.id) },
        }))
      }),
    },
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
jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => 'https://home.example' }))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/domain/posts/visibility', () => ({
  ...jest.requireActual('@/lib/domain/posts/visibility'),
  getAllowedVisibilities: jest.fn(async () => ['public']),
}))

const hub = { feed: [] as any[], total: 0 }
const hubClient = {
  getMyFeed: jest.fn(async ({ offset = 0, limit }: any) => ({
    posts: hub.feed.slice(offset, offset + limit),
    pagination: { total: hub.feed.length, limit, offset, hasMore: offset + limit < hub.feed.length },
    generatedAt: 'now',
  })),
  getRingFeed: jest.fn(async (_slug: string, { offset = 0, limit }: any) => ({
    posts: hub.feed.slice(offset, offset + limit),
    total: hub.feed.length,
  })),
  getTrendingFeed: jest.fn(async () => ({ posts: hub.feed, generatedAt: 'now' })),
}
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: () => hubClient }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  getRingHubClient: () => hubClient,
  getPublicRingHubClient: () => hubClient,
}))

import countHandler from '@/pages/api/comments/count'
import countsHandler from '@/pages/api/comments/counts'
import recentHandler from '@/pages/api/feed/recent'
import myRingsHandler from '@/pages/api/feed/my-rings'
import trendingHandler from '@/pages/api/feed/trending'
import ringPostsHandler from '@/pages/api/threadrings/[slug]/posts'
import userPostsHandler from '@/pages/api/posts/[username]'
import { getSessionUser } from '@/lib/auth/server'
import { countHiddenComments } from '@/lib/domain/users/blocks'

async function call(handler: any, query: Record<string, string>, viewer: string | null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  const req = { method: 'GET', query, headers: {} } as unknown as NextApiRequest
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

let clock = 0
const at = () => new Date(Date.now() - 60_000 + clock++ * 1000)
const comment = (id: string, postId: string, authorId: string, parentId: string | null = null, status = 'visible'): Comment =>
  ({ id, postId, authorId, parentId, status, createdAt: at() })
const post = (id: string, authorId: string): Post => ({ id, authorId, visibility: 'public', createdAt: at() })

beforeEach(() => {
  clock = 0
  queries.comment = 0
  state.blocks = [{ blockerId: 'me', blockedUserId: 'troll', blockedThreadRingId: null }]
  state.users = [
    { id: 'me', did: 'did:web:me', originalDid: null, signingDid: null },
    { id: 'friend', did: 'did:web:friend', originalDid: null, signingDid: null },
    { id: 'troll', did: 'did:web:troll', originalDid: 'did:key:troll-old', signingDid: 'did:key:troll-signing' },
  ]
  state.posts = [post('p1', 'friend'), post('p2', 'friend'), post('p3', 'troll')]
  state.comments = [
    // p1: 2 of 6 visible comments are mine to see
    comment('a', 'p1', 'friend'),
    comment('b', 'p1', 'troll'),
    comment('c', 'p1', 'friend', 'b'),       // reply to the blocked comment
    comment('d', 'p1', 'stranger', 'c'),     // reply to that reply
    comment('e', 'p1', 'stranger', 'a'),
    comment('f', 'p1', 'troll', 'a'),        // blocked reply under a fine comment
    comment('g', 'p1', 'troll', null, 'hidden'), // already hidden, never counted
    // p2: nobody blocked
    comment('h', 'p2', 'friend'),
  ]
})

describe('countHiddenComments', () => {
  test('counts blocked comments and every reply under them, visible only', async () => {
    const hidden = await countHiddenComments(['p1', 'p2'], ['troll'])
    expect(Object.fromEntries(hidden)).toEqual({ p1: 4 })
  })

  test('runs no queries when nobody is blocked', async () => {
    expect((await countHiddenComments(['p1'], [])).size).toBe(0)
    expect(queries.comment).toBe(0)
  })
})

describe('GET /api/comments/count and /counts', () => {
  test('a signed-in viewer’s count leaves out people they blocked', async () => {
    expect((await call(countHandler, { postId: 'p1' }, 'me')).body).toEqual({ count: 2 })
  })

  test('signed-out visitors and people who blocked nobody get the full count', async () => {
    expect((await call(countHandler, { postId: 'p1' }, null)).body).toEqual({ count: 6 })
    expect((await call(countHandler, { postId: 'p1' }, 'friend')).body).toEqual({ count: 6 })
  })

  test('batch counts match the single count, unknown ids stay 0', async () => {
    const query = { postIds: 'p1,p2,nope' }
    expect((await call(countsHandler, query, 'me')).body.counts).toEqual({ p1: 2, p2: 1, nope: 0 })
    expect((await call(countsHandler, query, null)).body.counts).toEqual({ p1: 6, p2: 1, nope: 0 })
  })
})

describe('feed and profile commentCount', () => {
  test('recent feed counts match what the viewer sees', async () => {
    const counts = (res: any) => Object.fromEntries(res.body.posts.map((p: any) => [p.id, p.commentCount]))
    expect(counts(await call(recentHandler, { limit: '50' }, 'me'))).toEqual({ p1: 2, p2: 1 })
    expect(counts(await call(recentHandler, { limit: '50' }, null))).toEqual({ p1: 6, p2: 1, p3: 0 })
  })

  test('profile posts carry viewer-aware counts', async () => {
    const res = await call(userPostsHandler, { username: 'friend' }, 'me')
    expect(res.body.posts.map((p: any) => [p.id, p.commentCount])).toEqual([['p2', 1], ['p1', 2]])
    expect(res.body.blocked).toBeUndefined()
  })

  test('a blocked person’s profile says they’re blocked instead of looking empty', async () => {
    expect((await call(userPostsHandler, { username: 'troll' }, 'me')).body).toEqual({ posts: [], blocked: true })
    expect((await call(userPostsHandler, { username: 'troll' }, null)).body.posts.map((p: any) => p.id)).toEqual(['p3'])
  })
})

describe('ring feeds', () => {
  const item = (id: string, actorDid: string, uri: string, extra: Record<string, unknown> = {}) => ({
    id,
    ringId: 'r1',
    ringSlug: 'knitting',
    ringName: 'Knitting',
    actorDid,
    actorName: null,
    uri,
    digest: id,
    submittedAt: 'then',
    submittedBy: actorDid,
    status: 'ACCEPTED',
    metadata: null,
    pinned: false,
    isNotification: false,
    notificationType: null,
    ...extra,
  })

  beforeEach(() => {
    hub.feed = [
      item('h1', 'did:web:friend', 'https://home.example/resident/friend/post/p1'),
      item('h2', 'did:web:troll', 'https://home.example/resident/troll/post/p3'),
      item('h3', 'did:key:troll-signing', 'https://home.example/tr/knitting', { isNotification: true, notificationType: 'member_joined' }),
      // submitted under a DID we no longer know, but it's still troll's local post
      item('h4', 'did:key:gone', 'https://home.example/resident/troll/post/p3'),
      item('h5', 'did:key:troll-old', 'https://elsewhere.example/post/x'),
      item('h6', 'did:web:someone-else', 'https://elsewhere.example/post/y'),
      item('h7', 'did:web:friend', 'https://home.example/resident/friend/post/p2'),
    ]
  })

  test('My Rings leaves out a blocked person’s posts and activity', async () => {
    const res = await call(myRingsHandler, { limit: '20' }, 'me')
    expect(res.body.posts.map((p: any) => p.id)).toEqual(['h1', 'h6', 'h7'])
  })

  test('My Rings pages by the hub’s list, so nothing repeats or gets skipped', async () => {
    const first = await call(myRingsHandler, { limit: '3' }, 'me')
    expect(first.body.nextOffset).toBe(3)
    const second = await call(myRingsHandler, { limit: '3', offset: String(first.body.nextOffset) }, 'me')
    const third = await call(myRingsHandler, { limit: '3', offset: String(second.body.nextOffset) }, 'me')
    expect([...first.body.posts, ...second.body.posts, ...third.body.posts].map((p: any) => p.id)).toEqual(['h1', 'h6', 'h7'])
  })

  test('people who blocked nobody get the hub feed as is', async () => {
    expect((await call(myRingsHandler, { limit: '20' }, 'friend')).body.posts).toHaveLength(7)
  })

  test('trending hides blocked people for signed-in viewers only', async () => {
    expect((await call(trendingHandler, {}, 'me')).body.posts.map((p: any) => p.id)).toEqual(['h1', 'h6', 'h7'])
    expect((await call(trendingHandler, {}, null)).body.posts).toHaveLength(7)
  })

  test('a ring’s own feed leaves out the blocked person’s posts and fixes the total', async () => {
    hub.feed = hub.feed.filter((p) => !p.isNotification)
    const mine = await call(ringPostsHandler, { slug: 'knitting' }, 'me')
    expect(mine.body.posts.map((p: any) => p.ringHubData.id)).toEqual(['h1', 'h6', 'h7'])
    expect(mine.body.total).toBe(3)

    const signedOut = await call(ringPostsHandler, { slug: 'knitting' }, null)
    expect(signedOut.body.posts).toHaveLength(6)
    expect(signedOut.body.total).toBe(6)
  })
})
