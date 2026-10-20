/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma mocks and handler stubs */
/**
 * "<Name> updated their page" items in the Recent and Following feeds
 * (lib/feed/page-updates.ts). The db mock runs the route's Prisma `where`
 * against in-memory people, follows, blocks and page updates, so these check
 * who actually shows up: blocks either way, profile visibility, suspended and
 * banned accounts.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { matchesWhere } from '../helpers/prisma-where'

jest.mock('@/lib/config/site/constants', () => ({ SITE_NAME: 'local' }))

type Person = {
  id: string
  visibility: 'public' | 'followers' | 'friends' | 'private'
  moderationStatus: 'active' | 'suspended' | 'banned'
  suspendedUntil: Date | null
  noProfile?: boolean
}
type Follow = { followerId: string; followeeId: string; status: string }
type Block = { blockerId: string; blockedUserId: string | null; blockedThreadRingId: string | null }
type PageUpdate = { id: string; userId: string; sharedAt: Date }

const state: { people: Person[]; follows: Follow[]; blocks: Block[]; pageUpdates: PageUpdate[] } = {
  people: [],
  follows: [],
  blocks: [],
  pageUpdates: [],
}

/** A User row with the relations visibleResidentWhere looks at */
function userRow(id: string) {
  const p = state.people.find((x) => x.id === id)!
  return {
    id,
    moderationStatus: p.moderationStatus,
    suspendedUntil: p.suspendedUntil,
    handles: [{ handle: id, host: 'local' }],
    profile: p.noProfile ? null : { displayName: id.toUpperCase(), avatarUrl: null, visibility: p.visibility },
    followers: state.follows.filter((f) => f.followeeId === id),
    following: state.follows.filter((f) => f.followerId === id),
    blocksCreated: state.blocks.filter((b) => b.blockerId === id),
    blocksReceived: state.blocks.filter((b) => b.blockedUserId === id),
  }
}

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    follow: {
      findMany: jest.fn(async ({ where }: any) => state.follows.filter((f) => matchesWhere(f, where))),
    },
    userBlock: {
      findMany: jest.fn(async ({ where }: any) => state.blocks.filter((b) => b.blockerId === where.blockerId)),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) =>
        state.people.map((p) => userRow(p.id)).filter((u) => matchesWhere(u, where)).map((u) => ({ id: u.id }))
      ),
    },
    comment: { findMany: jest.fn(async () => []) },
    post: { findMany: jest.fn(async () => []) },
    pageUpdate: {
      findMany: jest.fn(async ({ where, take }: any) =>
        state.pageUpdates
          .map((u) => ({ ...u, user: userRow(u.userId) }))
          .filter((u) => matchesWhere(u, where))
          .sort((a, b) => b.sharedAt.getTime() - a.sharedAt.getTime())
          .slice(0, take)
      ),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))

import recentHandler from '@/pages/api/feed/recent'
import followingHandler from '@/pages/api/feed/following'
import { getSessionUser } from '@/lib/auth/server'
import { pageUpdateWindow } from '@/lib/feed/page-updates'

function person(id: string, visibility: Person['visibility'] = 'public', extra: Partial<Person> = {}): Person {
  return { id, visibility, moderationStatus: 'active', suspendedUntil: null, ...extra }
}
const follow = (followerId: string, followeeId: string) => state.follows.push({ followerId, followeeId, status: 'accepted' })
const block = (blockerId: string, blockedUserId: string) =>
  state.blocks.push({ blockerId, blockedUserId, blockedThreadRingId: null })

let clock = 0
function shared(userId: string, at?: Date) {
  state.pageUpdates.push({ id: `pu-${userId}-${clock}`, userId, sharedAt: at ?? new Date(Date.UTC(2026, 9, 19, 12, 0, clock++)) })
}

async function call(handler: any, query: Record<string, string>) {
  const req = { method: 'GET', query, headers: {}, cookies: {} } as unknown as NextApiRequest
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
const who = (res: any) => (res.body.pageUpdates ?? []).map((u: any) => u.username).sort()

beforeEach(() => {
  clock = 0
  state.follows = []
  state.blocks = []
  state.pageUpdates = []
  state.people = [
    person('me'),
    person('pub'),
    person('nopro', 'public', { noProfile: true }),
    person('fol', 'followers'),
    person('folstranger', 'followers'),
    person('frn', 'friends'),
    person('mut', 'friends'),
    person('priv', 'private'),
    person('iblocked'),
    person('blocksme'),
    person('banned', 'public', { moderationStatus: 'banned' }),
    person('suspended', 'public', { moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() + 86_400_000) }),
    person('unsuspended', 'public', { moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() - 86_400_000) }),
  ]
  for (const id of ['pub', 'nopro', 'fol', 'frn', 'mut', 'priv', 'iblocked', 'blocksme', 'banned', 'suspended', 'unsuspended']) {
    follow('me', id)
  }
  follow('mut', 'me')
  block('me', 'iblocked')
  block('blocksme', 'me')
  for (const p of state.people) if (p.id !== 'me') shared(p.id)
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'me', primaryHandle: 'me@local', role: 'member' })
})

describe('Recent', () => {
  test('only public pages, minus blocks either way and suspended or banned accounts', async () => {
    const res = await call(recentHandler, { withPageUpdates: '1' })
    expect(res.statusCode).toBe(200)
    expect(who(res)).toEqual(['nopro', 'pub', 'unsuspended'])
  })

  test('a signed-out visitor sees the same public pages, blocks aside', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const res = await call(recentHandler, { withPageUpdates: '1' })
    expect(who(res)).toEqual(['blocksme', 'iblocked', 'nopro', 'pub', 'unsuspended'])
  })

  test('other callers (widgets, the new-posts poll) get posts only', async () => {
    const res = await call(recentHandler, {})
    expect(res.body).not.toHaveProperty('pageUpdates')
  })

  test('the card carries what it needs and nothing about the viewer', async () => {
    const res = await call(recentHandler, { withPageUpdates: '1' })
    const pub = res.body.pageUpdates.find((u: any) => u.username === 'pub')
    expect(pub).toEqual({
      id: expect.any(String),
      userId: 'pub',
      username: 'pub',
      displayName: 'PUB',
      avatarUrl: null,
      sharedAt: expect.any(String),
      publicPage: true,
    })
  })
})

describe('Following', () => {
  test('people I follow, by their profile visibility, minus blocks and moderation', async () => {
    const res = await call(followingHandler, { withPageUpdates: '1' })
    expect(res.statusCode).toBe(200)
    // fol: followers-only and I follow; mut: friends-only and we follow each
    // other. Not frn (friends-only, doesn't follow back), priv, folstranger.
    expect(who(res)).toEqual(['fol', 'mut', 'nopro', 'pub', 'unsuspended'])
  })

  test('a followers-only page comes without a preview', async () => {
    const res = await call(followingHandler, { withPageUpdates: '1' })
    const fol = res.body.pageUpdates.find((u: any) => u.username === 'fol')
    expect(fol.publicPage).toBe(false)
  })

  test('following nobody: no page updates', async () => {
    state.follows = []
    const res = await call(followingHandler, { withPageUpdates: '1' })
    expect(res.body.pageUpdates).toEqual([])
  })
})

describe('the stretch of time a page of posts covers', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 9, 19, h))

  test('the first page: everything newer than its last post, while more posts follow', () => {
    expect(pageUpdateWindow(null, [{ createdAt: at(10) }, { createdAt: at(8) }], true)).toEqual({ notBefore: at(8) })
  })

  test('a later page: older than the previous page, down to its own last post', () => {
    expect(pageUpdateWindow(at(8), [{ createdAt: at(6) }], true)).toEqual({ before: at(8), notBefore: at(6) })
  })

  test('the last page: everything older than the previous page', () => {
    expect(pageUpdateWindow(at(6), [{ createdAt: at(5) }], false)).toEqual({ before: at(6) })
  })

  test('Recent only takes `before` past the first page', async () => {
    state.pageUpdates = []
    shared('pub', at(12))
    shared('nopro', at(3))
    const first = await call(recentHandler, { withPageUpdates: '1', before: at(4).toISOString() })
    expect(who(first)).toEqual(['nopro', 'pub'])
    const later = await call(recentHandler, { withPageUpdates: '1', offset: '10', before: at(4).toISOString() })
    expect(who(later)).toEqual(['nopro'])
  })
})
