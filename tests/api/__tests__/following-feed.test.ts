/**
 * GET /api/feed/following and the shared visibility rules
 * (lib/domain/posts/visibility.ts).
 *
 * The db mock evaluates the Prisma `where` the route builds against an
 * in-memory set of follows and posts, so these tests check which posts
 * actually come back, not just the shape of the query.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

type Follow = { followerId: string; followeeId: string; status: string }
type Post = { id: string; authorId: string; visibility: string; createdAt: Date; ringIds: string[] }

const state: { follows: Follow[]; posts: Post[]; blocks: { blockerId: string; blockedUserId: string | null; blockedThreadRingId: string | null }[] } = {
  follows: [],
  posts: [],
  blocks: [],
}

// --- a tiny evaluator for the subset of Prisma filters the route uses ---
function matchScalar(value: any, cond: any): boolean {
  if (cond === undefined) return true
  if (cond instanceof Date) return value.getTime() === cond.getTime()
  if (cond === null || typeof cond !== 'object') return value === cond
  if ('in' in cond && !cond.in.includes(value)) return false
  if ('notIn' in cond && cond.notIn.includes(value)) return false
  if ('lt' in cond && !(value < cond.lt)) return false
  return true
}
function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, cond]: [string, any]) => {
    if (key === 'AND') return cond.every((w: any) => matches(row, w))
    if (key === 'OR') return cond.some((w: any) => matches(row, w))
    if (key === 'threadRings') {
      const blocked: string[] = cond.none.threadRing.id.in
      return !row.ringIds.some((id: string) => blocked.includes(id))
    }
    return matchScalar(row[key], cond)
  })
}

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    follow: {
      findMany: jest.fn(async ({ where }: any) => state.follows.filter((f) => matches(f, where))),
      findUnique: jest.fn(async ({ where }: any) => {
        const { followerId, followeeId } = where.followerId_followeeId
        return state.follows.find((f) => f.followerId === followerId && f.followeeId === followeeId) ?? null
      }),
    },
    userBlock: {
      findMany: jest.fn(async ({ where }: any) => state.blocks.filter((b) => b.blockerId === where.blockerId)),
    },
    comment: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    post: {
      findMany: jest.fn(async ({ where, take }: any) =>
        state.posts
          .filter((p) => matches(p, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))
          .slice(0, take)
          .map((p) => ({
            ...p,
            title: p.id,
            intent: null,
            updatedAt: p.createdAt,
            bodyHtml: null,
            bodyText: null,
            bodyMarkdown: null,
            media: null,
            tags: [],
            isSpoiler: false,
            contentWarning: null,
            metadata: null,
            threadRings: [],
            _count: { comments: 0 },
            author: { handles: [{ handle: p.authorId }], profile: null },
          }))
      ),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))

import handler from '@/pages/api/feed/following'
import { getSessionUser } from '@/lib/auth/server'
import { allowedVisibilities, canViewPost, getViewerRelationship } from '@/lib/domain/posts/visibility'

const VISIBILITIES = ['public', 'followers', 'friends', 'private']
let clock = 0
function postsBy(authorId: string, ringIds: string[] = []): Post[] {
  return VISIBILITIES.map((visibility) => ({
    id: `${authorId}-${visibility}`,
    authorId,
    visibility,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, clock++)),
    ringIds,
  }))
}
const accepted = (followerId: string, followeeId: string): Follow => ({ followerId, followeeId, status: 'accepted' })

async function call(query: Record<string, string> = {}, viewer: string | null = 'me') {
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
const ids = (res: any) => res.body.posts.map((p: any) => p.id).sort()

beforeEach(() => {
  clock = 0
  state.follows = [
    accepted('me', 'friend'), accepted('friend', 'me'),       // mutual
    accepted('me', 'followee'),                               // one-way, I follow them
    accepted('fan', 'me'),                                    // one-way, they follow me
    { followerId: 'me', followeeId: 'pending', status: 'pending' },
    accepted('me', 'blocked'), accepted('blocked', 'me'),
    accepted('me', 'ringy'),
  ]
  state.posts = [
    ...postsBy('me'), ...postsBy('friend'), ...postsBy('followee'), ...postsBy('fan'),
    ...postsBy('stranger'), ...postsBy('pending'), ...postsBy('blocked'), ...postsBy('ringy', ['ring-x']),
  ]
  state.blocks = [
    { blockerId: 'me', blockedUserId: 'blocked', blockedThreadRingId: null },
    { blockerId: 'me', blockedUserId: null, blockedThreadRingId: 'ring-x' },
  ]
})

describe('GET /api/feed/following', () => {
  test('shows public + followers posts from people I follow, friends posts only from mutuals, never private', async () => {
    const res = await call({ limit: '50' })
    expect(res.statusCode).toBe(200)
    expect(ids(res)).toEqual([
      'followee-followers', 'followee-public',
      'friend-followers', 'friend-friends', 'friend-public',
    ])
    expect(res.body.posts.every((p: any) => p.visibility !== 'private')).toBe(true)
    expect(res.body.followingCount).toBe(4) // friend, followee, blocked, ringy (pending excluded)
  })

  test('leaves out my own posts, followers I do not follow back, strangers and pending follows', async () => {
    const authors = new Set((await call({ limit: '50' })).body.posts.map((p: any) => p.authorId))
    for (const a of ['me', 'fan', 'stranger', 'pending']) expect(authors.has(a)).toBe(false)
  })

  test('respects blocks on people and rings', async () => {
    const authors = new Set((await call({ limit: '50' })).body.posts.map((p: any) => p.authorId))
    expect(authors.has('blocked')).toBe(false)
    expect(authors.has('ringy')).toBe(false)
  })

  test('a follow that is no longer mutual loses friends posts', async () => {
    state.follows = state.follows.filter((f) => !(f.followerId === 'friend' && f.followeeId === 'me'))
    const res = await call({ limit: '50' })
    expect(ids(res)).not.toContain('friend-friends')
    expect(ids(res)).toContain('friend-followers')
  })

  test('newest first, with a cursor that walks every page without repeats', async () => {
    const seen: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const res = await call(cursor ? { limit: '2', cursor } : { limit: '2' })
      seen.push(...res.body.posts.map((p: any) => p.id))
      cursor = res.body.nextCursor
      expect(res.body.hasMore).toBe(cursor !== null)
      pages++
    } while (cursor && pages < 10)

    expect(pages).toBe(3)
    expect(new Set(seen).size).toBe(seen.length)
    const times = seen.map((id) => state.posts.find((p) => p.id === id)!.createdAt.getTime())
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    expect(seen.sort()).toEqual(ids(await call({ limit: '50' })))
  })

  test('following nobody returns an empty page with followingCount 0', async () => {
    state.follows = []
    const res = await call()
    expect(res.body).toEqual({ posts: [], hasMore: false, nextCursor: null, followingCount: 0 })
  })

  test('signed out gets 401', async () => {
    const res = await call({}, null)
    expect(res.statusCode).toBe(401)
  })
})

describe('visibility rules', () => {
  test('allowedVisibilities by relationship', () => {
    expect(allowedVisibilities({ isAuthor: false, isFollower: false, isFriend: false })).toEqual(['public'])
    expect(allowedVisibilities({ isAuthor: false, isFollower: true, isFriend: false })).toEqual(['public', 'followers'])
    expect(allowedVisibilities({ isAuthor: false, isFollower: true, isFriend: true })).toEqual(['public', 'followers', 'friends'])
    expect(allowedVisibilities({ isAuthor: true, isFollower: false, isFriend: false })).toContain('private')
  })

  test('getViewerRelationship needs accepted follows both ways for friends', async () => {
    expect(await getViewerRelationship('me', 'friend')).toEqual({ isAuthor: false, isFollower: true, isFriend: true })
    expect(await getViewerRelationship('me', 'followee')).toEqual({ isAuthor: false, isFollower: true, isFriend: false })
    expect(await getViewerRelationship('me', 'fan')).toEqual({ isAuthor: false, isFollower: false, isFriend: false })
    expect(await getViewerRelationship('me', 'pending')).toEqual({ isAuthor: false, isFollower: false, isFriend: false })
    expect(await getViewerRelationship(null, 'friend')).toEqual({ isAuthor: false, isFollower: false, isFriend: false })
    expect((await getViewerRelationship('me', 'me')).isAuthor).toBe(true)
  })

  test('canViewPost: private is author-only', async () => {
    expect(canViewPost('private', await getViewerRelationship('me', 'friend'))).toBe(false)
    expect(canViewPost('private', await getViewerRelationship('me', 'me'))).toBe(true)
    expect(canViewPost('friends', await getViewerRelationship('me', 'followee'))).toBe(false)
  })
})
