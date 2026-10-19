/**
 * The profile and its profile-level APIs follow the same rules as pixel
 * homes (lib/domain/users/profile-access.ts), against a real Postgres: the
 * profile API, ring badges, quick view, guestbook status, the directory,
 * shared template source and the photo gallery.
 * Same fixtures as home-privacy.dbtest.ts. The badges, source and media
 * pages and the homepage neighborhood widget are checked in
 * tests/api/__tests__/profile-privacy-pages.test.ts (no JSX transform here).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
  isAdmin: (u: any) => u?.role === 'admin',
}))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))
// Badges come from RingHub; with it off a visible profile answers { badges: [] }
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => false } }))
jest.mock('@/lib/api/did/server-did-client', () => ({ getUserDID: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn() }))

import profileHandler from '@/pages/api/profile/[username]'
import badgesHandler from '@/pages/api/users/[username]/badges'
import quickViewHandler from '@/pages/api/users/[username]/quick-view'
import guestbookStatusHandler from '@/pages/api/users/[username]/guestbook-status'
import directoryHandler from '@/pages/api/directory'
import sourceHandler from '@/pages/api/profile/[username]/source'
import photosHandler from '@/pages/api/photos/[username]'
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
      primaryHandle: `${handle}@${SITE_NAME}`,
      handles: { create: { handle, host: SITE_NAME } },
      ...(opts.visibility === null
        ? {}
        : { profile: { create: { displayName: handle, bio: `${handle} bio`, visibility: opts.visibility ?? 'public' } } }),
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
const ALL_OWNERS = Object.keys(OWNERS) as OwnerKind[]

const VIEWERS = ['guest', 'owner', 'stranger', 'pending', 'follower', 'friend', 'admin', 'blocker', 'blocked'] as const
type ViewerKind = (typeof VIEWERS)[number]

/** Who should see each kind of profile. A block either way hides it, even from a follower. */
const CAN_SEE: Record<OwnerKind, ViewerKind[]> = {
  public: ['guest', 'owner', 'stranger', 'pending', 'follower', 'friend', 'admin'],
  none: ['guest', 'owner', 'stranger', 'pending', 'follower', 'friend', 'admin'],
  followers: ['owner', 'follower', 'friend', 'admin'],
  friends: ['owner', 'friend', 'admin'],
  private: ['owner', 'admin'],
}

/** Each owner writes one post of every visibility; this is how many each viewer may read. */
const POSTS_SEEN: Partial<Record<ViewerKind, number>> = { owner: 4, friend: 3, follower: 2 }

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

  for (const kind of ALL_OWNERS) {
    const o = ownerId(kind)
    for (const visibility of ['public', 'followers', 'friends', 'private'] as const) {
      await db.post.create({ data: { authorId: o, title: `${kind} ${visibility}`, visibility } })
    }
    await db.notification.create({ data: { recipientId: o, actorId: 'u_stranger', type: 'guestbook', status: 'unread' } })
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

async function call(handler: any, query: Record<string, string>, viewer: string | null, method = 'GET') {
  asViewer(viewer)
  const req = { method, query, headers: {}, cookies: {} } as unknown as NextApiRequest
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

/** Every owner × viewer pair, with whether the viewer may see that profile. */
const everyPair = () =>
  ALL_OWNERS.flatMap((owner) => VIEWERS.map((viewer) => ({ owner, viewer, visible: CAN_SEE[owner].includes(viewer) })))

beforeAll(seed)
afterAll(() => db.$disconnect())

// --------------------------------------------------------------- routes --

describe('GET /api/profile/[username]', () => {
  test('follows visibility and blocks either way', async () => {
    for (const { owner, viewer, visible } of everyPair()) {
      const res = await call(profileHandler, { username: OWNERS[owner] }, viewerId(viewer, owner))
      expect([owner, viewer, res.statusCode]).toEqual([owner, viewer, visible ? 200 : 403])
      if (visible) expect(res.body.userId).toBe(ownerId(owner))
      else expect(res.body.profile).toBeUndefined()
    }
  })

  test('the 403 keeps the shape the resident page reads, and a block reads as private', async () => {
    const hidden = await call(profileHandler, { username: OWNERS.followers }, 'u_stranger')
    expect(hidden.body).toEqual({
      error: 'private_profile',
      visibility: 'followers',
      username: OWNERS.followers,
      displayName: OWNERS.followers,
      avatarUrl: null,
    })
    for (const v of ['u_blocker', 'u_blocked']) {
      const res = await call(profileHandler, { username: OWNERS.public }, v)
      expect(res.body).toEqual({
        error: 'private_profile',
        visibility: 'private',
        username: OWNERS.public,
        displayName: OWNERS.public,
        avatarUrl: null,
      })
    }
  })
})

describe('GET /api/users/[username]/badges', () => {
  test('follows the profile’s visibility and blocks', async () => {
    for (const { owner, viewer, visible } of everyPair()) {
      const res = await call(badgesHandler, { username: OWNERS[owner] }, viewerId(viewer, owner))
      expect([owner, viewer, res.statusCode]).toEqual([owner, viewer, visible ? 200 : 403])
      expect(res.body).toEqual(visible ? { badges: [] } : { error: 'private_profile', visibility: expect.any(String) })
    }
  })
})

describe('GET /api/users/[username]/quick-view', () => {
  test('a hidden profile shows who it is, but no bio, counts or home', async () => {
    for (const { owner, viewer, visible } of everyPair()) {
      if (visible) continue
      const res = await call(quickViewHandler, { username: OWNERS[owner] }, viewerId(viewer, owner))
      expect([owner, viewer, res.statusCode]).toEqual([owner, viewer, 200])
      expect(res.body.data).toEqual(
        expect.objectContaining({
          userId: ownerId(owner),
          username: OWNERS[owner],
          bio: null,
          stats: null,
          badges: [],
          hasPixelHome: false,
          visibility: viewer === 'blocker' || viewer === 'blocked' ? 'private' : owner,
        })
      )
    }
  })

  test('a pending follower can still see whom they asked to follow', async () => {
    const res = await call(quickViewHandler, { username: OWNERS.followers }, 'u_pending')
    expect(res.body.data).toEqual(expect.objectContaining({ displayName: OWNERS.followers, relationship: 'none' }))
  })

  test('the post count only counts posts the viewer may read', async () => {
    for (const { owner, viewer, visible } of everyPair()) {
      if (!visible) continue
      const res = await call(quickViewHandler, { username: OWNERS[owner] }, viewerId(viewer, owner))
      expect(res.body.data.visibility).toBeUndefined()
      expect([owner, viewer, res.body.data.stats.posts]).toEqual([owner, viewer, POSTS_SEEN[viewer] ?? 1])
      if (owner !== 'none') expect(res.body.data.bio).toBe(`${OWNERS[owner]} bio`)
    }
  })
})

describe('GET /api/users/[username]/guestbook-status', () => {
  test('only the owner learns about unread guestbook notes', async () => {
    const guest = await call(guestbookStatusHandler, { username: OWNERS.public }, null)
    expect(guest.statusCode).toBe(401)
    for (const v of ['u_stranger', 'u_friend', 'u_admin']) {
      const res = await call(guestbookStatusHandler, { username: OWNERS.public }, v)
      expect([v, res.statusCode]).toEqual([v, 403])
      expect(res.body.hasUnreadGuestbook).toBeUndefined()
    }
    const own = await call(guestbookStatusHandler, { username: OWNERS.public }, ownerId('public'))
    expect(own.statusCode).toBe(200)
    expect(own.body).toEqual({ hasUnreadGuestbook: true, unreadCount: 1 })
  })
})

describe('GET /api/directory', () => {
  const listed = async (viewer: string | null, query: Record<string, string> = {}) => {
    const res = await call(directoryHandler, { limit: '50', ...query }, viewer)
    expect(res.statusCode).toBe(200)
    return res.body.users.map((u: any) => u.id) as string[]
  }

  test('lists public profiles, minus anyone blocked either way', async () => {
    const everyone = ['stranger', 'pending', 'follower', 'friend', 'blocker', 'blocked', 'admin'].map((h) => `u_${h}`)
    const publicOwners = [ownerId('public'), ownerId('none')]

    expect((await listed(null)).sort()).toEqual([...publicOwners, ...everyone].sort())
    expect((await listed('u_stranger')).sort()).toEqual([...publicOwners, ...everyone].sort())

    // Each blocks (or is blocked by) every owner
    for (const v of ['u_blocker', 'u_blocked']) {
      const ids = await listed(v)
      expect(ids).not.toContain(ownerId('public'))
      expect(ids).not.toContain(ownerId('none'))
      expect(ids).toContain(v)
    }
  })

  test('the total, search and random picks leave blocked people out too', async () => {
    const res = await call(directoryHandler, { limit: '50' }, 'u_blocked')
    expect(res.body.total).toBe(res.body.users.length)
    expect(await listed('u_blocked', { search: OWNERS.public })).toEqual([])
    expect(await listed('u_stranger', { search: OWNERS.public })).toEqual([ownerId('public')])
    for (let i = 0; i < 5; i++) {
      expect(await listed('u_blocker', { sortBy: 'random' })).not.toContain(ownerId('public'))
    }
  })
})

describe('GET /api/profile/[username]/source', () => {
  const PROFILED: OwnerKind[] = ALL_OWNERS.filter((o) => o !== 'none')

  beforeAll(() =>
    db.profile.updateMany({ data: { showTemplateSource: true, customCSS: '.shared { color: teal; }' } })
  )
  afterAll(() => db.profile.updateMany({ data: { showTemplateSource: false, customCSS: null } }))

  test('shared source follows the profile’s visibility and blocks', async () => {
    for (const { owner, viewer, visible } of everyPair()) {
      if (!PROFILED.includes(owner)) continue
      const res = await call(sourceHandler, { username: OWNERS[owner] }, viewerId(viewer, owner))
      expect([owner, viewer, res.statusCode]).toEqual([owner, viewer, visible ? 200 : 403])
      if (visible) expect(res.body.customCSS).toBe('.shared { color: teal; }')
      else expect(res.body).toEqual({ error: 'private_profile', visibility: expect.any(String) })
    }
  })

  test('a block reads as private, and unshared source is still owner-only', async () => {
    for (const v of ['u_blocker', 'u_blocked']) {
      const res = await call(sourceHandler, { username: OWNERS.public }, v)
      expect(res.body).toEqual({ error: 'private_profile', visibility: 'private' })
    }
    await db.profile.update({ where: { userId: ownerId('public') }, data: { showTemplateSource: false } })
    const stranger = await call(sourceHandler, { username: OWNERS.public }, 'u_stranger')
    expect(stranger.statusCode).toBe(403)
    expect(stranger.body.error).not.toBe('private_profile')
    const own = await call(sourceHandler, { username: OWNERS.public }, ownerId('public'))
    expect(own.statusCode).toBe(200)
    expect(own.body.customCSS).toBe('.shared { color: teal; }')
  })
})

describe('GET /api/photos/[username]', () => {
  beforeAll(async () => {
    for (const kind of ALL_OWNERS) {
      await db.media.create({
        data: {
          userId: ownerId(kind),
          thumbnailUrl: `https://cdn.test/${kind}-t.png`,
          mediumUrl: `https://cdn.test/${kind}-m.png`,
          fullUrl: `https://cdn.test/${kind}.png`,
        },
      })
    }
  })
  afterAll(() => db.media.deleteMany({}))

  test('public photos follow the profile’s visibility and blocks', async () => {
    for (const { owner, viewer, visible } of everyPair()) {
      const res = await call(photosHandler, { username: OWNERS[owner] }, viewerId(viewer, owner))
      expect([owner, viewer, res.statusCode]).toEqual([owner, viewer, visible ? 200 : 403])
      if (visible) expect(res.body.media.map((m: any) => m.fullUrl)).toEqual([`https://cdn.test/${owner}.png`])
      else expect(res.body).toEqual({ error: 'private_profile', visibility: expect.any(String) })
    }
  })
})
