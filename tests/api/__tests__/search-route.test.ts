/**
 * GET /api/search — privacy, blocks, LIKE wildcards, ranking with
 * over-fetch, excerpts, ring links/clients and input validation.
 *
 * The db mock evaluates the Prisma `where` the route builds (with ILIKE
 * semantics, see tests/api/helpers/prisma-where.ts) against in-memory rows.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { matchesWhere } from '../helpers/prisma-where'

type User = {
  id: string
  createdAt: Date
  handles: { handle: string; host: string }[]
  profile: { displayName: string | null; bio: string | null; avatarUrl: string | null; visibility: string } | null
}
type Post = {
  id: string
  authorId: string
  title: string | null
  bodyText: string | null
  bodyHtml: string | null
  bodyMarkdown: string | null
  tags: string[]
  visibility: string
  createdAt: Date
  threadRings: { threadRing: { id: string } }[]
}

const state: {
  users: User[]
  posts: Post[]
  blocks: { blockerId: string; blockedUserId: string | null; blockedThreadRingId: string | null }[]
  rings: { id: string; slug: string }[]
} = { users: [], posts: [], blocks: [], rings: [] }

const newestFirst = (a: { createdAt: Date }, b: { createdAt: Date }) => b.createdAt.getTime() - a.createdAt.getTime()

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    user: {
      findMany: jest.fn(async ({ where, orderBy, take }: any) => {
        let rows = state.users.filter((u) => matchesWhere(u, where))
        if (orderBy) rows = rows.sort(newestFirst)
        return rows.slice(0, take).map((u) => ({
          ...u,
          handles: [...u.handles].sort((a, b) => a.handle.localeCompare(b.handle)).slice(0, 1),
          _count: { posts: 0, followers: 0 },
        }))
      }),
    },
    post: {
      findMany: jest.fn(async ({ where, take }: any) =>
        state.posts
          .filter((p) => matchesWhere(p, where))
          .sort(newestFirst)
          .slice(0, take)
          .map((p) => {
            const author = state.users.find((u) => u.id === p.authorId)!
            return { ...p, author: { id: author.id, handles: author.handles, profile: author.profile }, _count: { comments: 0 } }
          })
      ),
    },
    userBlock: {
      findMany: jest.fn(async ({ where }: any) => state.blocks.filter((b) => b.blockerId === where.blockerId)),
    },
    threadRing: {
      findMany: jest.fn(async ({ where }: any) => state.rings.filter((r) => where.id.in.includes(r.id))),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({ getThreadRingSystem: () => 'ringhub' }))
const hubRings = [
  { id: 'hub-cats', slug: 'cats', name: 'Cats', description: 'cats!', memberCount: 3, postCount: 9 },
  { id: 'hub-catnip', slug: 'catnip', name: 'Catnip', description: null, memberCount: 1, postCount: 0 },
]
const publicClient = { listRings: jest.fn(async () => ({ rings: hubRings })) }
const userClient = { listRings: jest.fn(async () => ({ rings: hubRings })) }
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn(() => publicClient) }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(() => userClient),
}))

import handler from '@/pages/api/search'
import { getSessionUser } from '@/lib/auth/server'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'

let clock = 0
const at = () => new Date(Date.UTC(2026, 0, 1, 0, 0, clock++))

function user(id: string, opts: { bio?: string; displayName?: string; visibility?: string; noProfile?: boolean } = {}): User {
  return {
    id,
    createdAt: at(),
    handles: [{ handle: id, host: 'local' }],
    profile: opts.noProfile
      ? null
      : {
          displayName: opts.displayName ?? null,
          bio: opts.bio ?? null,
          avatarUrl: null,
          visibility: opts.visibility ?? 'public',
        },
  }
}
function post(id: string, authorId: string, opts: Partial<Post> = {}): Post {
  return {
    id,
    authorId,
    title: null,
    bodyText: null,
    bodyHtml: null,
    bodyMarkdown: null,
    tags: [],
    visibility: 'public',
    createdAt: at(),
    threadRings: [],
    ...opts,
  }
}

async function call(query: Record<string, string>, viewer: string | null = null) {
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
const ids = (res: any, type?: string) =>
  res.body.results.filter((r: any) => !type || r.type === type).map((r: any) => r.id)

beforeEach(() => {
  clock = 0
  state.users = []
  state.posts = []
  state.blocks = []
  state.rings = []
  jest.clearAllMocks()
})

describe('privacy', () => {
  beforeEach(() => {
    state.users = [
      user('pub', { bio: 'I love gardening' }),
      user('priv', { bio: 'I love gardening', visibility: 'private' }),
      user('fols', { bio: 'I love gardening', visibility: 'followers' }),
      user('frnd', { bio: 'I love gardening', visibility: 'friends' }),
      user('bare', { noProfile: true }),
    ]
  })

  test('only public profiles (and users without a profile row) appear, bios included', async () => {
    const res = await call({ q: 'gardening', type: 'users' })
    expect(res.statusCode).toBe(200)
    expect(ids(res)).toEqual(['pub'])
    expect(JSON.stringify(res.body)).not.toContain('priv')

    expect(ids(await call({ q: 'bare', type: 'users' }))).toEqual(['bare'])
  })

  test('a signed-in viewer still sees their own private profile, not others', async () => {
    const res = await call({ q: 'gardening', type: 'users' }, 'priv')
    expect(ids(res).sort()).toEqual(['priv', 'pub'])
  })
})

describe('blocks', () => {
  beforeEach(() => {
    state.users = [user('me'), user('nice', { bio: 'knitting' }), user('rude', { bio: 'knitting' })]
    state.posts = [
      post('p-nice', 'nice', { title: 'Knitting socks' }),
      post('p-rude', 'rude', { title: 'Knitting hats' }),
      post('p-ring', 'nice', { title: 'Knitting in a ring', threadRings: [{ threadRing: { id: 'local-cats' } }] }),
    ]
    state.rings = [{ id: 'local-cats', slug: 'cats' }]
    state.blocks = [
      { blockerId: 'me', blockedUserId: 'rude', blockedThreadRingId: null },
      { blockerId: 'me', blockedUserId: null, blockedThreadRingId: 'local-cats' },
    ]
  })

  test("blocked users and their posts are left out for the blocker", async () => {
    const res = await call({ q: 'knitting' }, 'me')
    expect(ids(res, 'user')).toEqual(['nice'])
    expect(ids(res, 'post')).toEqual(['p-nice'])
  })

  test('posts in a blocked ring and the ring itself (matched by slug) are left out', async () => {
    const res = await call({ q: 'cat' }, 'me')
    expect(ids(res, 'threadring')).toEqual(['hub-catnip'])
    expect(ids(await call({ q: 'knitting', type: 'posts' }, 'me'))).not.toContain('p-ring')
  })

  test('other viewers are unaffected', async () => {
    const res = await call({ q: 'knitting' }, 'nice')
    expect(ids(res, 'user').sort()).toEqual(['nice', 'rude'])
    expect(ids(res, 'post').sort()).toEqual(['p-nice', 'p-ring', 'p-rude'])
  })
})

describe('LIKE wildcards are literal', () => {
  beforeEach(() => {
    state.users = [user('a_b'), user('axb'), user('plain', { bio: '100% cotton' }), user('other', { bio: 'wool' })]
  })

  test('% matches only a literal percent sign, not everyone', async () => {
    expect(ids(await call({ q: '%', type: 'users' }))).toEqual(['plain'])
  })

  test('_ matches only a literal underscore, in contains and exact matches', async () => {
    expect(ids(await call({ q: 'a_b', type: 'users' }))).toEqual(['a_b'])
    expect(ids(await call({ q: '_', type: 'users' }))).toEqual(['a_b'])
  })

  test('a backslash is literal too', async () => {
    expect(ids(await call({ q: '\\', type: 'users' }))).toEqual([])
  })
})

describe('ranking with over-fetch', () => {
  test('an old exact-title post beats 120 newer substring matches', async () => {
    state.users = [user('author')]
    state.posts = [post('exact', 'author', { title: 'Love' })]
    for (let i = 0; i < 120; i++) state.posts.push(post(`p${i}`, 'author', { title: `Post ${i}`, bodyText: 'I love this' }))

    const res = await call({ q: 'love', type: 'posts' })
    expect(res.body.results).toHaveLength(20)
    expect(res.body.results[0].id).toBe('exact')
  })

  test('an old user whose @handle is the query beats 120 newer bio matches', async () => {
    state.users = [user('home', { displayName: 'Sam' })]
    for (let i = 0; i < 120; i++) state.users.push(user(`u${i}`, { displayName: `User ${i}`, bio: 'my home page' }))

    const res = await call({ q: 'home', type: 'users' })
    expect(res.body.results[0].id).toBe('home')
    expect(res.body.results[0]).not.toHaveProperty('keys')
  })

  test('an old prefix title match beats newer body-only matches that fell outside `limit`', async () => {
    state.users = [user('author')]
    state.posts = [post('prefix', 'author', { title: 'Lovely weather' })]
    for (let i = 0; i < 60; i++) state.posts.push(post(`p${i}`, 'author', { title: `Post ${i}`, bodyText: 'love' }))

    const res = await call({ q: 'love', type: 'posts', limit: '5' })
    expect(ids(res)[0]).toBe('prefix')
  })
})

describe('post matching and excerpts', () => {
  beforeEach(() => {
    state.users = [user('author')]
  })

  test('markup in bodyHtml/bodyMarkdown does not match ("href", "nbsp")', async () => {
    state.posts = [
      post('html', 'author', { bodyHtml: '<p><a href="https://x.y">link</a>&nbsp;</p>', bodyText: 'link' }),
      post('md', 'author', { bodyMarkdown: '[link](https://x.y/href)', bodyText: 'link' }),
    ]
    expect(ids(await call({ q: 'href', type: 'posts' }))).toEqual([])
    expect(ids(await call({ q: 'nbsp', type: 'posts' }))).toEqual([])
    expect(ids(await call({ q: 'link', type: 'posts' })).sort()).toEqual(['html', 'md'])
  })

  test('excerpts drop entities, tags and image remnants', async () => {
    state.posts = [
      post('a', 'author', { title: 'Trip', bodyText: 'Went&nbsp;hiking &amp; camping !IMG_0980.png so <b>nice</b>' }),
    ]
    const [result] = (await call({ q: 'hiking', type: 'posts' })).body.results
    expect(result.description).toBe('Went hiking & camping so nice')
  })

  test('private posts never match', async () => {
    state.posts = [post('secret', 'author', { title: 'Diary', visibility: 'private' })]
    expect(ids(await call({ q: 'diary', type: 'posts' }))).toEqual([])
  })
})

describe('rings', () => {
  test('anonymous search uses the unsigned public client and links to /tr/:slug', async () => {
    const res = await call({ q: 'cat', type: 'threadrings' })
    expect(getPublicRingHubClient).toHaveBeenCalled()
    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalled()
    expect(res.body.results.map((r: any) => r.url).sort()).toEqual(['/tr/catnip', '/tr/cats'])
  })

  test('signed-in search uses the user-signed client', async () => {
    state.users = [user('me')]
    await call({ q: 'cat', type: 'threadrings' }, 'me')
    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('me')
    expect(getPublicRingHubClient).not.toHaveBeenCalled()
  })

  test('a hub failure is reported as partial, not as "no results"', async () => {
    publicClient.listRings.mockRejectedValueOnce(new Error('hub down'))
    const res = await call({ q: 'cat', type: 'threadrings' })
    expect(res.statusCode).toBe(200)
    expect(res.body.partial).toBe(true)
    expect(res.body.errors).toEqual([{ source: 'threadrings', message: 'hub down' }])
  })
})

describe('input validation', () => {
  test.each(['abc', '-1', '0', '1.5', '10abc'])('limit=%s is a 400', async (limit) => {
    const res = await call({ q: 'x', limit })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/limit/)
  })

  test('a large limit is clamped to 50', async () => {
    state.users = Array.from({ length: 70 }, (_, i) => user(`m${i}`, { bio: 'match' }))
    const res = await call({ q: 'match', type: 'users', limit: '500' })
    expect(res.statusCode).toBe(200)
    expect(res.body.results).toHaveLength(50)
  })

  test('an unknown type is a 400', async () => {
    expect((await call({ q: 'x', type: 'threadring' })).statusCode).toBe(400)
  })
})
