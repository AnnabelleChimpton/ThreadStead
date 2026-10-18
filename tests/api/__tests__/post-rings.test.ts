/**
 * POST /api/posts/rings — sending an existing post to rings it didn't reach
 * ("Try again" on the composer, "Add to a ring" on a post).
 *
 * The db mock keeps posts, rings and links in memory so these check the two
 * ThreadStead mirrors (Post.threadRingPostIds, PostThreadRing + postCount)
 * after the call, not just which Prisma methods ran. The hub is a fake
 * RingPostingClient; the real hub path is in tests/federation.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'

type Ring = { id: string; slug: string; name: string; postCount: number }
type Link = { postId: string; threadRingId: string; addedBy: string }

const state: {
  posts: any[]
  rings: Ring[]
  links: Link[]
} = { posts: [], rings: [], links: [] }

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        const post = state.posts.find((p) => p.id === where.id)
        if (!post) return null
        return include?.author ? { ...post, author: { primaryHandle: 'alice@threadstead' } } : { ...post }
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const post = state.posts.find((p) => p.id === where.id)
        Object.assign(post, data)
        return post
      }),
    },
    threadRing: {
      findMany: jest.fn(async ({ where }: any) => state.rings.filter((r) => where.slug.in.includes(r.slug))),
      create: jest.fn(async ({ data }: any) => {
        const ring = { id: `local-${data.slug}`, slug: data.slug, name: data.name, postCount: data.postCount }
        state.rings.push(ring)
        return ring
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        for (const r of state.rings) if (where.id.in.includes(r.id)) r.postCount += data.postCount.increment
      }),
    },
    postThreadRing: {
      findMany: jest.fn(async ({ where }: any) =>
        state.links.filter((l) => l.postId === where.postId && where.threadRingId.in.includes(l.threadRingId))
      ),
      createMany: jest.fn(async ({ data }: any) => {
        state.links.push(...data)
      }),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/server/http/rate-limit', () => ({
  rateLimitCheck: jest.fn().mockResolvedValue(true),
}))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))

import handler from '@/pages/api/posts/rings'
import { getSessionUser } from '@/lib/auth/server'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { NOT_A_MEMBER_REASON, PUBLIC_ONLY_REASON } from '@/lib/domain/posts/ring-submission'

/** A fake hub where the user belongs to `memberOf`; accepted refs are remembered by slug. */
function fakeHub(memberOf: string[]) {
  const refs = new Map<string, string>()
  const hub = {
    getMyMemberships: jest.fn(async () => ({
      memberships: memberOf.map((slug) => ({ ringSlug: slug, ringName: `Ring ${slug}`, status: 'ACTIVE' })),
      hasMore: false,
    })),
    submitPost: jest.fn(async (slug: string) => {
      if (refs.has(slug)) {
        throw new RingHubClientError('Duplicate submission', 409, undefined, {
          error: 'Duplicate submission',
          existingPost: { id: refs.get(slug), status: 'ACCEPTED' },
        })
      }
      refs.set(slug, `ref-${slug}`)
      return { id: `ref-${slug}`, status: 'ACCEPTED' }
    }),
  }
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(hub)
  return hub
}

function call(body: any) {
  const req = { method: 'POST', query: {}, body, headers: {}, url: '/api/posts/rings' } as unknown as NextApiRequest
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
    end: jest.fn(),
  }
  return (handler(req, res) as Promise<void>).then(() => res as NextApiResponse & { statusCode: number; jsonBody: any })
}

function seedPost(overrides: Record<string, unknown> = {}) {
  state.posts.push({
    id: 'post-1',
    authorId: 'alice',
    title: 'Hello rings',
    bodyText: 'hi',
    bodyHtml: null,
    bodyMarkdown: null,
    visibility: 'public',
    isSpoiler: false,
    contentWarning: null,
    metadata: null,
    publishedAt: new Date('2026-10-17T10:00:00Z'),
    // Already in "first" from when it was published.
    threadRingPostIds: { first: 'ref-first' },
    ...overrides,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  state.posts = []
  state.rings = [{ id: 'local-first', slug: 'first', name: 'Ring first', postCount: 1 }]
  state.links = [{ postId: 'post-1', threadRingId: 'local-first', addedBy: 'alice' }]
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'alice', role: 'member' })
})
afterEach(() => jest.restoreAllMocks())

test('signed out: 401', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  seedPost()
  const res = await call({ postId: 'post-1', rings: ['second'] })
  expect(res.statusCode).toBe(401)
})

test('someone else’s post: 403 and nothing reaches the hub', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'mallory', role: 'member' })
  seedPost()
  const hub = fakeHub(['second'])
  const res = await call({ postId: 'post-1', rings: ['second'] })
  expect(res.statusCode).toBe(403)
  expect(hub.submitPost).not.toHaveBeenCalled()
})

test('a missing post: 404', async () => {
  fakeHub(['second'])
  const res = await call({ postId: 'nope', rings: ['second'] })
  expect(res.statusCode).toBe(404)
})

test('no rings: 400', async () => {
  seedPost()
  const res = await call({ postId: 'post-1', rings: [] })
  expect(res.statusCode).toBe(400)
})

test('adds the post to a new ring and keeps the rings it was already in', async () => {
  seedPost()
  const hub = fakeHub(['first', 'second'])
  const res = await call({ postId: 'post-1', rings: ['second', 'never-joined'] })

  expect(res.statusCode).toBe(200)
  expect(res.jsonBody.rings).toEqual([
    { slug: 'second', name: 'Ring second', status: 'posted', hubPostId: 'ref-second' },
    { slug: 'never-joined', name: 'never-joined', status: 'failed', reason: NOT_A_MEMBER_REASON },
  ])
  // The submission is the same one create.ts builds: canonical URI, post's own publish time.
  expect(hub.submitPost).toHaveBeenCalledTimes(1)
  const [slug, submission] = hub.submitPost.mock.calls[0] as unknown as [string, any]
  expect(slug).toBe('second')
  expect(submission.uri).toMatch(/\/resident\/alice\/post\/post-1$/)
  expect(submission.metadata).toMatchObject({ title: 'Hello rings', threadRingSlug: 'second', publishedAt: '2026-10-17T10:00:00.000Z' })

  // Mirrors: the id map is merged, not replaced; a local ring row is made for
  // the hub ring and linked once.
  expect(state.posts[0].threadRingPostIds).toEqual({ first: 'ref-first', second: 'ref-second' })
  expect(state.links.map((l) => l.threadRingId).sort()).toEqual(['local-first', 'local-second'])
  expect(state.rings.find((r) => r.slug === 'second')?.postCount).toBe(1)
  expect(state.rings.find((r) => r.slug === 'first')?.postCount).toBe(1)
})

test('sending again to a ring the post is already in changes nothing', async () => {
  seedPost()
  fakeHub(['first', 'second'])
  await call({ postId: 'post-1', rings: ['second'] })
  const res = await call({ postId: 'post-1', rings: ['second'] })

  expect(res.jsonBody.rings).toEqual([{ slug: 'second', name: 'Ring second', status: 'posted', hubPostId: 'ref-second' }])
  expect(state.links.filter((l) => l.threadRingId === 'local-second')).toHaveLength(1)
  expect(state.rings.find((r) => r.slug === 'second')?.postCount).toBe(1)
})

test('a non-public post is refused before the hub is called', async () => {
  seedPost({ visibility: 'followers' })
  const hub = fakeHub(['second'])
  const res = await call({ postId: 'post-1', rings: ['second'] })

  expect(res.jsonBody.rings).toEqual([{ slug: 'second', name: 'second', status: 'failed', reason: PUBLIC_ONLY_REASON }])
  expect(hub.getMyMemberships).not.toHaveBeenCalled()
  expect(state.links).toHaveLength(1)
})
