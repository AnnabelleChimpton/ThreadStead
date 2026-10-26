/**
 * Pixel homes follow their owner's profile visibility, against a real
 * Postgres: the single-home check (residentAccess), the list filter
 * (visibleResidentWhere) agreeing with it for every viewer relationship,
 * and each route that serves a home. Same setup as search-grouped.dbtest.ts.
 * The .tsx pages can't load in this project (no JSX transform); their
 * wiring is in tests/api/__tests__/home-privacy-pages.test.ts.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
  isAdmin: (u: any) => u?.role === 'admin',
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  ...jest.requireActual('@/lib/server/http/rate-limit'),
  rateLimitCheck: jest.fn(async () => true),
}))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))
// The capability is just the signer's user id here; minting is tested elsewhere.
jest.mock('@/lib/domain/users/capabilities', () => ({
  requireAction: () => async (cap: string) => ({ sub: cap }),
}))
jest.mock('@/lib/domain/notifications', () => ({ createGuestbookNotification: jest.fn() }))

import { residentAccess, visibleResidentWhere } from '@/lib/domain/users/profile-access'
import homeHandler from '@/pages/api/home/[handle]'
import decorationsHandler from '@/pages/api/home/decorations/load'
import visitorsHandler from '@/pages/api/home/[handle]/visitors'
import lineageHandler from '@/pages/api/users/[username]/threadring-lineage'
import guestbookHandler from '@/pages/api/guestbook/[username]'
import { getServerSideProps as randomProps } from '@/pages/neighborhood/random'
import { getSessionUser } from '@/lib/auth/server'

// ------------------------------------------------------------- fixtures --

type Role = 'member' | 'admin'
const roles = new Map<string, Role>()

let seq = 0
async function person(handle: string, opts: { visibility?: Visibility | null; role?: Role } = {}) {
  const id = `u_${handle}`
  roles.set(id, opts.role ?? 'member')
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      role: opts.role ?? 'member',
      handles: { create: { handle, host: SITE_NAME } },
      ...(opts.visibility === null
        ? {}
        : { profile: { create: { displayName: handle, visibility: opts.visibility ?? 'public' } } }),
    },
  })
  return id
}

const follow = (followerId: string, followeeId: string, status = 'accepted') =>
  db.follow.create({ data: { followerId, followeeId, status } })
const block = (blockerId: string, blockedUserId: string) => db.userBlock.create({ data: { blockerId, blockedUserId } })

const OWNERS = {
  public: 'pub',
  followers: 'fol',
  friends: 'fri',
  private: 'priv',
  none: 'noprofile', // no Profile row: public
} as const
type OwnerKind = keyof typeof OWNERS
const ownerId = (kind: OwnerKind) => `u_${OWNERS[kind]}`

const VIEWERS = ['guest', 'owner', 'stranger', 'pending', 'follower', 'friend', 'admin', 'blocker', 'blocked'] as const
type ViewerKind = (typeof VIEWERS)[number]

/** Who should see each kind of home on its own page. Lists drop the admin exception. */
const CAN_SEE: Record<OwnerKind, ViewerKind[]> = {
  public: ['guest', 'owner', 'stranger', 'pending', 'follower', 'friend', 'admin'],
  none: ['guest', 'owner', 'stranger', 'pending', 'follower', 'friend', 'admin'],
  followers: ['owner', 'follower', 'friend', 'admin'],
  friends: ['owner', 'friend', 'admin'],
  private: ['owner', 'admin'],
}

function viewerId(kind: ViewerKind, owner: OwnerKind): string | null {
  if (kind === 'guest') return null
  if (kind === 'owner') return ownerId(owner)
  return `u_${kind}`
}

async function seed() {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  roles.clear()
  await person(OWNERS.public, { visibility: 'public' })
  await person(OWNERS.followers, { visibility: 'followers' })
  await person(OWNERS.friends, { visibility: 'friends' })
  await person(OWNERS.private, { visibility: 'private' })
  await person(OWNERS.none, { visibility: null })
  for (const v of ['stranger', 'pending', 'follower', 'friend', 'blocker', 'blocked']) await person(v)
  await person('admin', { role: 'admin' })

  for (const kind of Object.keys(OWNERS) as OwnerKind[]) {
    const o = ownerId(kind)
    await db.userHomeConfig.create({
      data: { userId: o, houseTemplate: 'cabin_v1', palette: 'pixel_petals', houseTitle: `${kind} house` },
    })
    await db.userHomeDecoration.create({
      data: { userId: o, decorationType: 'plant', decorationId: 'roses_red', zone: 'front_yard', positionX: 1, positionY: 2 },
    })
    await db.guestbookEntry.create({ data: { profileOwner: o, authorId: 'u_stranger', message: `hello ${kind}` } })
    await follow('u_pending', o, 'pending')
    await follow('u_follower', o)
    await follow('u_friend', o)
    await follow(o, 'u_friend')
    // Followers who are also blocked either way still see nothing
    await follow('u_blocker', o)
    await follow('u_blocked', o)
    await block('u_blocker', o)
    await block(o, 'u_blocked')
  }
}

function asViewer(id: string | null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(id ? { id, role: roles.get(id) ?? 'member' } : null)
}

async function call(handler: any, query: Record<string, string>, viewer: string | null, method = 'GET', body?: any) {
  asViewer(viewer)
  const req = { method, query, body, headers: {}, cookies: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
    end() { return this },
  }
  await handler(req, res as NextApiResponse)
  return res
}

const ctx = (query: Record<string, string>, viewer: string | null, params?: Record<string, string>) => {
  asViewer(viewer)
  return { query, params: params ?? query, req: { headers: {}, cookies: {} }, res: { setHeader() {} } } as any
}

const sessionViewer = (id: string | null) => (id ? { id, role: roles.get(id) ?? 'member' } : null)

beforeAll(seed)
afterAll(() => db.$disconnect())

// ---------------------------------------------------------- the rules --

describe('residentAccess and visibleResidentWhere', () => {
  const cases = (Object.keys(OWNERS) as OwnerKind[]).flatMap((owner) =>
    VIEWERS.map((viewer) => [owner, viewer, CAN_SEE[owner].includes(viewer)] as const)
  )

  test.each(cases)('%s home, %s viewer: visible = %s', async (owner, viewer, expected) => {
    const id = viewerId(viewer, owner)
    const access = await residentAccess(sessionViewer(id), ownerId(owner))
    expect(access.visible).toBe(expected)
  })

  test('a block reads as private, whatever the profile says', async () => {
    for (const v of ['u_blocker', 'u_blocked']) {
      expect(await residentAccess(sessionViewer(v), ownerId('public'))).toEqual({
        visible: false,
        visibility: 'private',
        blocked: true,
      })
    }
    expect(await residentAccess(null, ownerId('friends'))).toEqual({
      visible: false,
      visibility: 'friends',
      blocked: false,
    })
  })

  test.each(VIEWERS.filter((v) => v !== 'owner'))('the list filter matches the single check for %s', async (viewer) => {
    const id = viewerId(viewer, 'public')
    const listed = await db.userHomeConfig.findMany({ where: { user: visibleResidentWhere(id) }, select: { userId: true } })
    const expected = (Object.keys(OWNERS) as OwnerKind[])
      // Lists have no admin exception, like search
      .filter((o) => CAN_SEE[o].includes(viewer) && (viewer !== 'admin' || o === 'public' || o === 'none'))
      .map(ownerId)
    expect(listed.map((r) => r.userId).sort()).toEqual(expected.sort())
  })

  test('owners always find their own home in a list', async () => {
    for (const owner of Object.keys(OWNERS) as OwnerKind[]) {
      const listed = await db.userHomeConfig.findMany({
        where: { user: visibleResidentWhere(ownerId(owner)) },
        select: { userId: true },
      })
      expect(listed.map((r) => r.userId)).toContain(ownerId(owner))
    }
  })
})

// --------------------------------------------------------------- routes --

describe('home routes', () => {
  const routes: Array<[string, any, (handle: string) => Record<string, string>]> = [
    ['GET /api/home/[handle]', homeHandler, (h) => ({ handle: h })],
    ['GET /api/home/decorations/load', decorationsHandler, (h) => ({ username: h })],
    ['GET /api/home/[handle]/visitors', visitorsHandler, (h) => ({ handle: h })],
    ['GET /api/users/[username]/threadring-lineage', lineageHandler, (h) => ({ username: h })],
  ]

  test.each(routes)('%s follows the profile’s visibility', async (_name, handler, query) => {
    for (const owner of Object.keys(OWNERS) as OwnerKind[]) {
      for (const viewer of VIEWERS) {
        const res = await call(handler, query(OWNERS[owner]), viewerId(viewer, owner))
        const visible = CAN_SEE[owner].includes(viewer)
        expect([owner, viewer, res.statusCode]).toEqual([owner, viewer, visible ? 200 : 403])
        if (!visible) expect(res.body.error).toBe('private_profile')
      }
    }
  })

  test('a hidden home says which kind of private it is, like the profile API', async () => {
    const res = await call(homeHandler, { handle: OWNERS.followers }, 'u_stranger')
    expect(res.body).toEqual({ error: 'private_profile', visibility: 'followers' })
  })

  test('a visit to a hidden home is not recorded', async () => {
    const res = await call(visitorsHandler, { handle: OWNERS.private }, 'u_stranger', 'POST')
    expect(res.statusCode).toBe(403)
    expect(await db.pixelHomeVisitor.count({ where: { homeOwnerId: ownerId('private') } })).toBe(0)

    const ok = await call(visitorsHandler, { handle: OWNERS.public }, 'u_stranger', 'POST')
    expect(ok.statusCode).toBe(200)
    expect(await db.pixelHomeVisitor.count({ where: { homeOwnerId: ownerId('public') } })).toBe(1)
  })

  test('looking at a hidden home doesn’t create one for its owner', async () => {
    const shy = await person('shy', { visibility: 'private' })
    expect((await call(homeHandler, { handle: 'shy' }, null)).statusCode).toBe(403)
    expect(await db.userHomeConfig.findUnique({ where: { userId: shy } })).toBeNull()
  })
})

describe('guestbook', () => {
  test('reading follows the profile’s visibility', async () => {
    for (const owner of Object.keys(OWNERS) as OwnerKind[]) {
      for (const viewer of VIEWERS.filter((v) => v !== 'blocker' && v !== 'blocked')) {
        const res = await call(guestbookHandler, { username: OWNERS[owner] }, viewerId(viewer, owner))
        const visible = CAN_SEE[owner].includes(viewer)
        expect([owner, viewer, res.statusCode]).toEqual([owner, viewer, visible ? 200 : 403])
        if (visible) expect(res.body.entries.map((e: any) => e.message)).toEqual([`hello ${owner}`])
      }
    }
  })

  test('across a block it reads as empty, the way profile posts do', async () => {
    for (const v of ['u_blocker', 'u_blocked']) {
      const res = await call(guestbookHandler, { username: OWNERS.public }, v)
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual({ entries: [] })
    }
  })

  test('nobody signs a guestbook they can’t see, or across a block', async () => {
    for (const [owner, signer] of [['private', 'u_stranger'], ['friends', 'u_follower'], ['public', 'u_blocked'], ['public', 'u_blocker']] as const) {
      const res = await call(guestbookHandler, { username: OWNERS[owner] }, signer, 'POST', { message: 'hi', cap: signer })
      expect([owner, signer, res.statusCode]).toEqual([owner, signer, 403])
    }
    const res = await call(guestbookHandler, { username: OWNERS.friends }, 'u_friend', 'POST', { message: 'hi friend', cap: 'u_friend' })
    expect(res.statusCode).toBe(201)
  })
})

// ---------------------------------------------------------------- pages --

describe('random house', () => {
  test('is never a hidden one', async () => {
    for (let i = 0; i < 20; i++) {
      const result: any = await randomProps(ctx({}, 'u_stranger'))
      expect([`/home/${OWNERS.public}`, `/home/${OWNERS.none}`]).toContain(result.redirect.destination)
    }
    // Everyone is hidden from someone both sides blocked
    const blocked: any = await randomProps(ctx({}, 'u_blocked'))
    expect(blocked.redirect.destination).toBe('/neighborhood')
  })
})
