/**
 * GET /api/directory — private profiles, LIKE wildcards, sortBy=random and
 * limit/offset validation.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { matchesWhere } from '../helpers/prisma-where'

jest.mock('@/lib/config/site/constants', () => ({ SITE_NAME: 'local' }))

type User = {
  id: string
  createdAt: Date
  handles: { handle: string; host: string }[]
  profile: { displayName: string | null; bio: string | null; avatarUrl: string | null; visibility: string } | null
  moderationStatus: 'active' | 'suspended' | 'banned'
  suspendedUntil: Date | null
  deletesAt: Date | null
}
const state: { users: User[] } = { users: [] }

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    user: {
      findMany: jest.fn(async ({ where, take, skip, select }: any) => {
        let rows = state.users.filter((u) => matchesWhere(u, where))
        rows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        rows = rows.slice(skip ?? 0, take === undefined ? undefined : (skip ?? 0) + take)
        if (select) return rows.map((u) => ({ id: u.id }))
        return rows.map((u) => ({ ...u, _count: { posts: 0, followers: 0, following: 0 } }))
      }),
      count: jest.fn(async ({ where }: any) => state.users.filter((u) => matchesWhere(u, where)).length),
    },
  },
}))

import handler from '@/pages/api/directory'

let clock = 0
function user(
  id: string,
  opts: { bio?: string; visibility?: string; noProfile?: boolean; moderation?: Pick<User, 'moderationStatus' | 'suspendedUntil'> } = {}
): User {
  return {
    id,
    moderationStatus: opts.moderation?.moderationStatus ?? 'active',
    suspendedUntil: opts.moderation?.suspendedUntil ?? null,
    deletesAt: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)),
    handles: [{ handle: id, host: 'local' }],
    profile: opts.noProfile
      ? null
      : { displayName: null, bio: opts.bio ?? null, avatarUrl: null, visibility: opts.visibility ?? 'public' },
  }
}

async function call(query: Record<string, string>) {
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
const names = (res: any) => res.body.users.map((u: any) => u.username)

beforeEach(() => {
  clock = 0
  state.users = [
    user('pub', { bio: 'likes 100% wool' }),
    user('priv', { bio: 'secret bio', visibility: 'private' }),
    user('fols', { visibility: 'followers' }),
    user('bare', { noProfile: true }),
    user('a_b'),
    user('axb'),
  ]
})

test('suspended and banned accounts are not listed or counted; an ended suspension is', async () => {
  const day = 24 * 60 * 60 * 1000
  state.users.push(
    user('banned', { moderation: { moderationStatus: 'banned', suspendedUntil: null } }),
    user('suspended', { moderation: { moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() + day) } }),
    user('back', { moderation: { moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() - day) } })
  )
  const res = await call({})
  expect(names(res).sort()).toEqual(['a_b', 'axb', 'back', 'bare', 'pub'])
  expect(res.body.total).toBe(5)
})

test('private, followers-only and friends-only profiles are not listed; totals agree', async () => {
  const res = await call({})
  expect(res.statusCode).toBe(200)
  expect(names(res).sort()).toEqual(['a_b', 'axb', 'bare', 'pub'])
  expect(res.body.total).toBe(4)
  expect(JSON.stringify(res.body)).not.toContain('secret bio')
  expect(names(await call({ search: 'secret' }))).toEqual([])
})

test('% and _ in the search box are literal', async () => {
  expect(names(await call({ search: '%' }))).toEqual(['pub'])
  expect(names(await call({ search: 'a_b' }))).toEqual(['a_b'])
})

test('sortBy=random returns `limit` distinct visible users, and no further pages', async () => {
  for (let i = 0; i < 30; i++) state.users.push(user(`r${i}`))
  const res = await call({ sortBy: 'random', limit: '5' })
  expect(res.statusCode).toBe(200)
  expect(res.body.users).toHaveLength(5)
  expect(new Set(names(res)).size).toBe(5)
  expect(names(res)).not.toContain('priv')
  expect(res.body.hasMore).toBe(false)
  // every user has a username — the Surprise button reads `.username`
  expect(res.body.users.every((u: any) => typeof u.username === 'string')).toBe(true)
})

test('sortBy=random actually varies', async () => {
  for (let i = 0; i < 30; i++) state.users.push(user(`r${i}`))
  const seen = new Set<string>()
  for (let i = 0; i < 10; i++) seen.add(names(await call({ sortBy: 'random', limit: '1' }))[0])
  expect(seen.size).toBeGreaterThan(1)
})

test.each([
  [{ limit: 'abc' }, /limit/],
  [{ limit: '0' }, /limit/],
  [{ offset: '-5' }, /offset/],
  [{ offset: 'x' }, /offset/],
  [{ sortBy: 'banana' }, /sortBy/],
])('%j is a 400', async (query, message) => {
  const res = await call(query as Record<string, string>)
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toMatch(message)
})

test('offset pages through results', async () => {
  const first = names(await call({ limit: '2' }))
  const second = names(await call({ limit: '2', offset: '2' }))
  expect(first).toHaveLength(2)
  expect(second).toHaveLength(2)
  expect(first.filter((n: string) => second.includes(n))).toEqual([])
})
