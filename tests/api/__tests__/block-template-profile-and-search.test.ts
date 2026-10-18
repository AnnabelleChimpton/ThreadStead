/**
 * Blocking also reaches template-rendered profiles and search: a profile
 * built from a template shows no posts from someone the viewer blocked (and
 * says why), and search result comment counts leave out a blocked person's
 * comments and the replies under them.
 *
 * Like block-counts-and-rings.test.ts, the db mock evaluates the Prisma
 * `where` each caller builds against in-memory rows.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

type Comment = { id: string; postId: string; authorId: string; parentId: string | null; status: string }
type Post = { id: string; authorId: string; visibility: string; createdAt: Date; ringIds: string[] }
type Block = { blockerId: string; blockedUserId: string | null; blockedThreadRingId: string | null }

const state: { posts: Post[]; comments: Comment[]; blocks: Block[]; users: string[] } = {
  posts: [],
  comments: [],
  blocks: [],
  users: [],
}

// --- a tiny evaluator for the subset of Prisma filters these callers use ---
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
    if (key === 'threadRings') {
      const blockedRings: string[] = cond.none.threadRing.id.in
      return !row.ringIds.some((id: string) => blockedRings.includes(id))
    }
    return matchScalar(row[key], cond)
  })
}
const visibleCount = (postId: string) =>
  state.comments.filter((c) => c.postId === postId && c.status === 'visible').length

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userBlock: {
      findMany: jest.fn(async ({ where }: any) => state.blocks.filter((b) => b.blockerId === where.blockerId)),
    },
    handle: {
      findFirst: jest.fn(async ({ where }: any) =>
        state.users.includes(where.handle) ? { handle: where.handle, user: { id: where.handle } } : null
      ),
    },
    comment: {
      findMany: jest.fn(async ({ where }: any) =>
        state.comments.filter((c) => matches(c, where)).map(({ id, postId, status }) => ({ id, postId, status }))
      ),
    },
    post: {
      findMany: jest.fn(async ({ where }: any) =>
        state.posts
          .filter((p) => matches(p, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((p) => ({
            ...p,
            title: p.id,
            bodyText: `${p.id} about cats`,
            bodyMarkdown: null,
            bodyHtml: null,
            author: { id: p.authorId, handles: [{ handle: p.authorId }], profile: null },
            threadRings: [],
            _count: { comments: visibleCount(p.id) },
          }))
      ),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({ getThreadRingSystem: () => 'ringhub' }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))
jest.mock('@/lib/domain/posts/visibility', () => ({
  ...jest.requireActual('@/lib/domain/posts/visibility'),
  getAllowedVisibilities: jest.fn(async () => ['public']),
}))
// The candidate SQL is covered against real Postgres (tests/db/search.dbtest.ts);
// here every post in state is a match.
jest.mock('@/lib/search/local', () => ({
  ...jest.requireActual('@/lib/search/local'),
  postCandidates: jest.fn(async () =>
    state.posts.map((p) => ({
      type: 'post',
      id: p.id,
      textRank: 1,
      trigram: 0.5,
      exact: false,
      activityAt: p.createdAt,
      follows: false,
      sharedRing: false,
    }))
  ),
}))

import searchHandler from '@/pages/api/search'
import { getPostsForUser } from '@/lib/utils/data/fetchers'
import { getSessionUser } from '@/lib/auth/server'

async function search(query: Record<string, string>, viewer: string | null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  const req = { method: 'GET', query, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
  }
  await searchHandler(req, res as NextApiResponse)
  return res
}

let clock = 0
const post = (id: string, authorId: string, ringIds: string[] = []): Post =>
  ({ id, authorId, visibility: 'public', createdAt: new Date(Date.now() - 60_000 + clock++ * 1000), ringIds })
const comment = (id: string, postId: string, authorId: string, parentId: string | null = null, status = 'visible'): Comment =>
  ({ id, postId, authorId, parentId, status })

beforeEach(() => {
  clock = 0
  state.users = ['me', 'friend', 'troll']
  state.blocks = [{ blockerId: 'me', blockedUserId: 'troll', blockedThreadRingId: null }]
  state.posts = [post('p1', 'friend'), post('p2', 'friend'), post('t1', 'troll')]
  state.comments = [
    // p1: 1 of 5 visible comments is mine to see
    comment('a', 'p1', 'friend'),
    comment('b', 'p1', 'troll'),
    comment('c', 'p1', 'friend', 'b'),       // reply to the blocked comment
    comment('d', 'p1', 'stranger', 'c'),     // reply to that reply
    comment('e', 'p1', 'troll', 'a'),        // blocked reply under a fine comment
    comment('f', 'p1', 'troll', null, 'hidden'), // already hidden, never counted
    // p2: nobody blocked
    comment('g', 'p2', 'friend'),
  ]
})

describe('getPostsForUser (template-rendered profiles)', () => {
  test('a viewer who blocked the owner gets no posts and blocked: true', async () => {
    expect(await getPostsForUser('troll', 'me')).toEqual({ posts: [], blocked: true })
  })

  test('everyone else still sees the owner’s posts', async () => {
    const asFriend = await getPostsForUser('troll', 'friend')
    expect(asFriend?.blocked).toBe(false)
    expect(asFriend?.posts.map((p) => p.id)).toEqual(['t1'])
    const asGuest = await getPostsForUser('troll')
    expect(asGuest?.posts.map((p) => p.id)).toEqual(['t1'])
  })

  test('posts in a ring the viewer blocked stay hidden', async () => {
    state.posts = [post('p1', 'friend'), post('p2', 'friend', ['ring-x'])]
    state.blocks.push({ blockerId: 'me', blockedUserId: null, blockedThreadRingId: 'ring-x' })
    expect((await getPostsForUser('friend', 'me'))?.posts.map((p) => p.id)).toEqual(['p1'])
    expect((await getPostsForUser('friend', 'troll'))?.posts.map((p) => p.id).sort()).toEqual(['p1', 'p2'])
  })
})

describe('GET /api/search comment counts', () => {
  const counts = (res: any) =>
    Object.fromEntries(res.body.results.map((r: any) => [r.id, [r.post.commentCount, r.meta.endsWith(`${r.post.commentCount} comments`)]]))

  test('a signed-in viewer’s counts leave out people they blocked', async () => {
    state.posts = [post('p1', 'friend'), post('p2', 'friend')]
    const res = await search({ q: 'cats', type: 'posts' }, 'me')
    expect(res.statusCode).toBe(200)
    expect(counts(res)).toEqual({ p1: [1, true], p2: [1, true] })
  })

  test('guests and people who blocked nobody see the full count', async () => {
    state.posts = [post('p1', 'friend'), post('p2', 'friend')]
    expect(counts(await search({ q: 'cats', type: 'posts' }, null))).toEqual({ p1: [5, true], p2: [1, true] })
    expect(counts(await search({ q: 'cats', type: 'posts' }, 'friend'))).toEqual({ p1: [5, true], p2: [1, true] })
  })

  test('grouped view counts the same way', async () => {
    state.posts = [post('p1', 'friend')]
    const res = await search({ q: 'cats', type: 'posts', view: 'grouped' }, 'me')
    expect(res.body.sections.posts.results[0].post.commentCount).toBe(1)
  })
})
