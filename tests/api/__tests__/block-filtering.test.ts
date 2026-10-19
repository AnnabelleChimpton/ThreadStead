/**
 * Blocking hides a person's comments (and the threads under them) and keeps
 * blocked people and rings out of the Recent and Active feeds.
 *
 * The db mock evaluates the Prisma `where` each route builds against
 * in-memory rows, so these tests check what actually comes back.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

type Comment = { id: string; authorId: string; parentId: string | null; status: string; createdAt: Date }
type Post = { id: string; authorId: string; visibility: string; createdAt: Date; ringIds: string[]; comments: Comment[] }
type Block = { blockerId: string; blockedUserId: string | null; blockedThreadRingId: string | null }

const state: { posts: Post[]; comments: Comment[]; blocks: Block[] } = { posts: [], comments: [], blocks: [] }

// --- a tiny evaluator for the subset of Prisma filters the routes use ---
function matchScalar(value: any, cond: any): boolean {
  if (cond === undefined) return true
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) return value === cond
  if ('in' in cond && !cond.in.includes(value)) return false
  if ('notIn' in cond && cond.notIn.includes(value)) return false
  if ('gte' in cond && !(value >= cond.gte)) return false
  return true
}
function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([key, cond]: [string, any]) => {
    if (key === 'AND') return cond.every((w: any) => matches(row, w))
    if (key === 'OR') return cond.some((w: any) => matches(row, w))
    if (key === 'threadRings') {
      const blocked: string[] = cond.none.threadRing.id.in
      return !row.ringIds.some((id: string) => blocked.includes(id))
    }
    if (key === 'comments') return row.comments.some((c: Comment) => matches(c, cond.some))
    return matchScalar(row[key], cond)
  })
}

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    // getRestrictedUserIds (lib/domain/users/moderation.ts): nobody suspended or banned
    user: { findMany: jest.fn(async () => []) },
    userBlock: {
      findMany: jest.fn(async ({ where }: any) => state.blocks.filter((b) => b.blockerId === where.blockerId)),
    },
    comment: {
      findMany: jest.fn(async ({ where }: any) =>
        state.comments
          .filter((c) => matches(c, where))
          .map((c) => ({ ...c, content: c.id, author: { id: c.authorId, primaryHandle: c.authorId, profile: null } }))
      ),
    },
    post: {
      findUnique: jest.fn(async ({ where }: any) =>
        state.posts.some((p) => p.id === where.id) ? { id: where.id, authorId: 'owner' } : null
      ),
      findMany: jest.fn(async ({ where, include, take, skip = 0 }: any) =>
        state.posts
          .filter((p) => matches(p, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(skip, skip + take)
          .map((p) => ({
            ...p,
            title: p.id,
            author: { handles: [{ handle: p.authorId }], profile: null },
            threadRings: p.ringIds.map((id) => ({ threadRing: { id, name: id, slug: id } })),
            _count: { comments: p.comments.length },
            comments: include?.comments
              ? p.comments
                  .filter((c) => matches(c, include.comments.where))
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                  .slice(0, include.comments.take)
                  .map((c) => ({ ...c, author: { handles: [{ handle: c.authorId }] } }))
              : undefined,
          }))
      ),
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
jest.mock('@/lib/domain/notifications', () => ({}))
jest.mock('@/lib/domain/posts/updateCommentCount', () => ({ updateCommentCount: jest.fn() }))
jest.mock('@/lib/domain/users/capabilities', () => ({ requireAction: jest.fn(), classifyExternalPostId: () => ({ kind: 'invalid' }) }))

import commentsHandler from '@/pages/api/comments/[postId]'
import recentHandler from '@/pages/api/feed/recent'
import activeHandler from '@/pages/api/feed/active'
import { getSessionUser } from '@/lib/auth/server'
import { filterBlockedComments } from '@/lib/domain/users/blocks'

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
const comment = (id: string, authorId: string, parentId: string | null = null): Comment =>
  ({ id, authorId, parentId, status: 'visible', createdAt: at() })

beforeEach(() => {
  clock = 0
  state.blocks = [
    { blockerId: 'me', blockedUserId: 'troll', blockedThreadRingId: null },
    { blockerId: 'me', blockedUserId: null, blockedThreadRingId: 'ring-x' },
  ]
})

describe('filterBlockedComments', () => {
  const thread = () => [
    comment('a', 'friend'),
    comment('b', 'troll'),
    comment('c', 'friend', 'b'),   // reply to the blocked comment
    comment('d', 'stranger', 'c'), // reply to that reply
    comment('e', 'stranger', 'a'),
  ]

  test('drops blocked authors and every reply under their comments', () => {
    expect(filterBlockedComments(thread(), ['troll']).map((c) => c.id)).toEqual(['a', 'e'])
  })

  test('works when replies come before their parent in the list', () => {
    expect(filterBlockedComments(thread().reverse(), ['troll']).map((c) => c.id)).toEqual(['e', 'a'])
  })

  test('filters nested replies without changing the input', () => {
    const nested = [
      { id: 'a', author: { id: 'friend' }, replies: [{ id: 'r1', author: { id: 'troll' } }, { id: 'r2', author: { id: 'friend' } }] },
      { id: 'b', author: { id: 'troll' }, replies: [{ id: 'r3', author: { id: 'friend' } }] },
    ]
    const out = filterBlockedComments(nested, ['troll'])
    expect(out.map((c) => c.id)).toEqual(['a'])
    expect(out[0].replies!.map((c) => c.id)).toEqual(['r2'])
    expect(nested[0].replies).toHaveLength(2)
  })

  test('no blocks leaves the list alone', () => {
    const list = thread()
    expect(filterBlockedComments(list, [])).toBe(list)
  })
})

describe('GET /api/comments/[postId]', () => {
  beforeEach(() => {
    state.posts = [{ id: 'p1', authorId: 'owner', visibility: 'public', createdAt: at(), ringIds: [], comments: [] }]
    state.comments = [
      comment('a', 'friend'),
      comment('b', 'troll'),
      comment('c', 'friend', 'b'),
      comment('e', 'stranger', 'a'),
    ].map((c) => ({ ...c, postId: 'p1' }))
  })

  test('hides a blocked person’s comments and the replies under them', async () => {
    const res = await call(commentsHandler, { postId: 'p1' }, 'me')
    expect(res.statusCode).toBe(200)
    expect(res.body.comments.map((c: any) => c.id)).toEqual(['a', 'e'])
  })

  test('signed-out visitors and people who blocked nobody see everything', async () => {
    expect((await call(commentsHandler, { postId: 'p1' }, null)).body.comments).toHaveLength(4)
    expect((await call(commentsHandler, { postId: 'p1' }, 'friend')).body.comments).toHaveLength(4)
  })
})

describe('GET /api/feed/recent and /api/feed/active', () => {
  beforeEach(() => {
    const post = (id: string, authorId: string, ringIds: string[] = [], comments: Comment[] = []): Post =>
      ({ id, authorId, visibility: 'public', createdAt: at(), ringIds, comments })
    state.posts = [
      post('friend-1', 'friend'),
      post('troll-1', 'troll'),
      post('ringy-1', 'stranger', ['ring-x']),
      post('quiet-1', 'stranger', [], [comment('c1', 'friend'), comment('c2', 'troll')]),
      { ...post('private-1', 'friend'), visibility: 'private' },
    ]
  })

  test.each([
    ['recent', recentHandler],
    ['active', activeHandler],
  ])('%s leaves out blocked people and rings for me', async (_name, handler) => {
    const ids = (await call(handler, { limit: '50' }, 'me')).body.posts.map((p: any) => p.id).sort()
    expect(ids).toEqual(['friend-1', 'quiet-1'])
  })

  test.each([
    ['recent', recentHandler],
    ['active', activeHandler],
  ])('%s shows every public post when signed out', async (_name, handler) => {
    const ids = (await call(handler, { limit: '50' }, null)).body.posts.map((p: any) => p.id).sort()
    expect(ids).toEqual(['friend-1', 'quiet-1', 'ringy-1', 'troll-1'])
  })

  test('active never names a blocked person as the latest commenter', async () => {
    const quiet = (res: any) => res.body.posts.find((p: any) => p.id === 'quiet-1')
    expect(quiet(await call(activeHandler, { limit: '50' }, null)).lastCommenterUsername).toBe('troll')
    expect(quiet(await call(activeHandler, { limit: '50' }, 'me')).lastCommenterUsername).toBe('friend')
  })

  test('recent paginates over the filtered list', async () => {
    const first = await call(recentHandler, { limit: '1' }, 'me')
    const second = await call(recentHandler, { limit: '1', offset: '1' }, 'me')
    expect([...first.body.posts, ...second.body.posts].map((p: any) => p.id).sort()).toEqual(['friend-1', 'quiet-1'])
  })
})
