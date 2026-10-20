/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma mocks and handler stubs */
/**
 * The residents list's "Recently updated" (GET /api/directory?sortBy=updated):
 * newest Profile.pageUpdatedAt first, people with none last, and the same
 * people as the other sorts (public profiles, no suspended or banned
 * accounts, no blocks either way). The db mock runs the route's where and
 * orderBy, so this checks the rows that come back.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { matchesWhere } from '../helpers/prisma-where'

jest.mock('@/lib/config/site/constants', () => ({ SITE_NAME: 'local' }))

type User = {
  id: string
  createdAt: Date
  handles: { handle: string; host: string }[]
  profile: { displayName: string | null; bio: string | null; avatarUrl: string | null; visibility: string; pageUpdatedAt: Date | null } | null
  moderationStatus: 'active' | 'suspended' | 'banned'
  suspendedUntil: Date | null
  blocksCreated: { blockedUserId: string }[]
  blocksReceived: { blockerId: string }[]
  followers: never[]
  following: never[]
}
const state: { users: User[] } = { users: [] }

/** Prisma's orderBy, for the fields the directory sorts on */
function compare(a: User, b: User, orderBy: any[]): number {
  for (const o of orderBy) {
    let x: any, y: any, dir: string, nulls = 'last'
    if (o.profile) {
      const spec = o.profile.pageUpdatedAt
      x = a.profile?.pageUpdatedAt ?? null
      y = b.profile?.pageUpdatedAt ?? null
      dir = spec.sort
      nulls = spec.nulls
    } else {
      const key = Object.keys(o)[0] as 'createdAt' | 'id'
      x = a[key]; y = b[key]; dir = o[key]
    }
    if (x === null && y === null) continue
    if (x === null) return nulls === 'last' ? 1 : -1
    if (y === null) return nulls === 'last' ? -1 : 1
    if (x < y) return dir === 'asc' ? -1 : 1
    if (x > y) return dir === 'asc' ? 1 : -1
  }
  return 0
}

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    user: {
      findMany: jest.fn(async ({ where, take, skip, orderBy }: any) => {
        let rows = state.users.filter((u) => matchesWhere(u, where))
        rows = rows.sort((a, b) => compare(a, b, Array.isArray(orderBy) ? orderBy : [orderBy]))
        rows = rows.slice(skip ?? 0, take === undefined ? undefined : (skip ?? 0) + take)
        return rows.map((u) => ({ ...u, _count: { posts: 0, followers: 0, following: 0 } }))
      }),
      count: jest.fn(async ({ where }: any) => state.users.filter((u) => matchesWhere(u, where)).length),
    },
  },
}))
jest.mock('@/components/ui/navigation/UserMention', () => ({
  __esModule: true,
  default: ({ displayName }: { displayName: string }) => displayName,
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'me', role: 'member' })) }))

import handler from '@/pages/api/directory'
import UserCard from '@/components/ui/feedback/UserCard'

const day = (d: number) => new Date(Date.UTC(2026, 9, d))
let clock = 0
function user(id: string, pageUpdatedAt: Date | null, opts: { visibility?: string; banned?: boolean } = {}): User {
  return {
    id,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)),
    handles: [{ handle: id, host: 'local' }],
    profile: { displayName: null, bio: null, avatarUrl: null, visibility: opts.visibility ?? 'public', pageUpdatedAt },
    moderationStatus: opts.banned ? 'banned' : 'active',
    suspendedUntil: null,
    blocksCreated: [],
    blocksReceived: [],
    followers: [],
    following: [],
  }
}

async function call(query: Record<string, string>) {
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
const names = (res: any) => res.body.users.map((u: any) => u.username)

beforeEach(() => {
  clock = 0
  const blocker = user('blocker', day(18))
  blocker.blocksCreated = [{ blockedUserId: 'me' }]
  state.users = [
    user('me', day(1)),
    user('old', day(3)),
    user('never1', null),
    user('fresh', day(19)),
    user('never2', null),
    user('mid', day(10)),
    user('secret', day(17), { visibility: 'private' }),
    user('gone', day(16), { banned: true }),
    blocker,
  ]
})

test('newest update first, people with no known update last (newest joiners first among them)', async () => {
  const res = await call({ sortBy: 'updated', limit: '20' })
  expect(res.statusCode).toBe(200)
  expect(names(res)).toEqual(['fresh', 'mid', 'old', 'me', 'never2', 'never1'])
})

test('private, banned and blocking people stay out, as in every other sort', async () => {
  const res = await call({ sortBy: 'updated', limit: '20' })
  expect(names(res)).not.toContain('secret')
  expect(names(res)).not.toContain('gone')
  expect(names(res)).not.toContain('blocker')
  expect(res.body.total).toBe(6)
})

test('pages through without repeats', async () => {
  const first = await call({ sortBy: 'updated', limit: '4', offset: '0' })
  const second = await call({ sortBy: 'updated', limit: '4', offset: '4' })
  expect([...names(first), ...names(second)]).toEqual(['fresh', 'mid', 'old', 'me', 'never2', 'never1'])
  expect(first.body.hasMore).toBe(true)
  expect(second.body.hasMore).toBe(false)
})

test('each card carries its update time', async () => {
  const res = await call({ sortBy: 'updated', limit: '20' })
  const fresh = res.body.users.find((u: any) => u.username === 'fresh')
  expect(new Date(fresh.pageUpdatedAt)).toEqual(day(19))
  expect(res.body.users.find((u: any) => u.username === 'never1').pageUpdatedAt).toBeNull()
})

describe('the card', () => {
  const card = {
    id: 'u1', username: 'pat', displayName: 'Pat', bio: null, avatarUrl: null,
    createdAt: '2026-01-05T00:00:00.000Z', postCount: 0, followerCount: 0, followingCount: 0,
    pageUpdatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  }

  test('says when the page was updated in the "Recently updated" sort', () => {
    render(React.createElement(UserCard, { user: card, showUpdated: true }))
    expect(screen.getByText('Updated 3 days ago')).toBeInTheDocument()
  })

  test('says when they joined otherwise, or when no update is known', () => {
    const { rerender } = render(React.createElement(UserCard, { user: card }))
    expect(screen.getByText('Joined January 2026')).toBeInTheDocument()
    rerender(React.createElement(UserCard, { user: { ...card, pageUpdatedAt: null }, showUpdated: true }))
    expect(screen.getByText('Joined January 2026')).toBeInTheDocument()
  })
})
