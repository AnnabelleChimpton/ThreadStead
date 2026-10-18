/**
 * Search Phase 2 against a real Postgres: the grouped view of /api/search
 * (what /search renders), pixel-home search, the card fields, and the
 * zero-results and Surprise Me routes. Same setup as search.dbtest.ts.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({ getThreadRingSystem: () => 'ringhub' }))
const hubClient = { listRings: jest.fn(async (_opts?: any) => ({ rings: [] as any[], total: 0 })) }
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn(() => hubClient) }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(() => hubClient),
}))

import searchHandler from '@/pages/api/search'
import nothingFoundHandler from '@/pages/api/search/nothing-found'
import surpriseHandler from '@/pages/api/search/surprise'
import { getSessionUser } from '@/lib/auth/server'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'

// ------------------------------------------------------------- fixtures --

async function reset() {
  await db.$executeRawUnsafe('TRUNCATE "User", "CustomPage", "ThreadRing", "CuratedSite", "IndexedSite" RESTART IDENTITY CASCADE')
}

let seq = 0
async function person(handle: string, opts: { displayName?: string; bio?: string; visibility?: Visibility; avatar?: string } = {}) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      handles: { create: { handle, host: 'local' } },
      profile: {
        create: {
          displayName: opts.displayName ?? handle,
          bio: opts.bio ?? null,
          visibility: opts.visibility ?? 'public',
          avatarThumbnailUrl: opts.avatar ?? null,
        },
      },
    },
  })
  return id
}

async function home(userId: string, data: { houseTitle?: string; houseBoardText?: string; houseDescription?: string; wallColor?: string } = {}) {
  await db.userHomeConfig.create({ data: { userId, houseTemplate: 'cabin_v1', palette: 'pixel_petals', ...data } })
}

async function post(id: string, authorId: string, data: { title?: string; bodyText?: string; visibility?: Visibility } = {}) {
  await db.post.create({ data: { id, authorId, title: 'Untitled Post', ...data } })
  return id
}

async function call(handler: any, query: Record<string, string>, viewer: string | null = null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  // A distinct address per call keeps the `search` rate limit out of the way.
  const req = { method: 'GET', query, headers: { 'x-forwarded-for': `198.51.100.${seq++ % 250}` } } as unknown as NextApiRequest
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

const grouped = (q: string, type: string, extra: Record<string, string> = {}, viewer: string | null = null) =>
  call(searchHandler, { q, type, view: 'grouped', ...extra }, viewer)

beforeEach(() => {
  hubClient.listRings.mockReset()
  hubClient.listRings.mockResolvedValue({ rings: [], total: 0 })
  clearCache()
})

afterAll(async () => {
  await db.$disconnect()
})

// --------------------------------------------------------- grouped view --

describe('grouped view', () => {
  beforeAll(async () => {
    await reset()
    const alice = await person('alice', { displayName: 'Alice Garden', bio: 'I grow tomatoes', avatar: 'https://cdn.test/a.png' })
    await home(alice, { wallColor: '#abcdef' })
    const bob = await person('bob', { displayName: 'Bob' })
    for (let i = 0; i < 7; i++) await post(`garden_${i}`, bob, { title: `Garden diary ${i}`, bodyText: 'tomatoes again' })
    await post('private_garden', bob, { title: 'Secret garden', visibility: 'private' })
    const ring = await db.threadRing.create({
      data: { id: 'r_gardeners', uri: 'https://hub.test/rings/gardeners', slug: 'gardeners', name: 'Gardeners', curatorId: bob },
    })
    await db.postThreadRing.create({ data: { postId: 'garden_0', threadRingId: ring.id, addedBy: bob } })
  })

  test('returns one section per requested type, ranked on its own', async () => {
    const res = await grouped('garden', 'users,posts,pages,homes')
    expect(res.statusCode).toBe(200)
    expect(Object.keys(res.body.sections).sort()).toEqual(['homes', 'pages', 'posts', 'users'])
    expect(res.body.sections.users.results.map((r: any) => r.id)).toEqual(['u_alice'])
    expect(res.body.sections.pages).toEqual({ results: [], total: 0, capped: false })
    // Rings weren't asked for, so the hub wasn't called.
    expect(hubClient.listRings).not.toHaveBeenCalled()
  })

  test('`per` limits rows while `total` counts every match the viewer may see', async () => {
    const res = await grouped('garden', 'posts', { per: '3' })
    const posts = res.body.sections.posts
    expect(posts.results).toHaveLength(3)
    expect(posts.total).toBe(7) // the private post isn't counted
    expect(posts.capped).toBe(false)
    expect(posts.results.every((r: any) => r.type === 'post')).toBe(true)
  })

  test('the owner sees their private post counted', async () => {
    const res = await grouped('garden', 'posts', {}, 'u_bob')
    expect(res.body.sections.posts.total).toBe(8)
  })

  test('people carry avatar, handle and house; posts carry author, date and ring', async () => {
    const res = await grouped('garden', 'users,posts', { per: '10' })
    const alice = res.body.sections.users.results[0]
    expect(alice.person).toEqual({
      handle: 'alice',
      avatarUrl: 'https://cdn.test/a.png',
      house: { template: 'cabin_v1', palette: 'pixel_petals', customizations: { wallColor: '#abcdef' } },
      postCount: 0,
      followerCount: 0,
    })
    const inRing = res.body.sections.posts.results.find((r: any) => r.id === 'garden_0')
    expect(inRing.post).toMatchObject({
      authorHandle: 'bob',
      authorName: 'Bob',
      ring: { name: 'Gardeners', slug: 'gardeners' },
      commentCount: 0,
    })
    expect(new Date(inRing.post.createdAt).toString()).not.toBe('Invalid Date')
    const loose = res.body.sections.posts.results.find((r: any) => r.id === 'garden_1')
    expect(loose.post.ring).toBeNull()
  })

  test('rings come in their own section with badge and member count', async () => {
    hubClient.listRings.mockResolvedValueOnce({
      rings: [
        { id: 'hub-g', slug: 'gardeners', name: 'Gardeners', description: 'dirt', memberCount: 12, postCount: 40, badgeImageUrl: 'https://hub.test/b.png' },
        { id: 'hub-k', slug: 'kitchen-garden', name: 'Kitchen garden', memberCount: 1, postCount: 0, badgeImageUrl: null },
      ],
      total: 2,
    })
    const res = await grouped('gardeners', 'threadrings')
    const rings = res.body.sections.threadrings
    expect(rings.results.map((r: any) => r.id)).toEqual(['hub-g', 'hub-k'])
    expect(rings.results[0].ring).toEqual({ slug: 'gardeners', badgeImageUrl: 'https://hub.test/b.png', memberCount: 12, postCount: 40 })
    expect(rings.total).toBe(2)
    expect(res.body.partial).toBe(false)
  })

  test('a hub failure is reported for the rings section only', async () => {
    hubClient.listRings.mockRejectedValueOnce(new Error('hub down'))
    jest.spyOn(console, 'error').mockImplementationOnce(() => {})
    const res = await grouped('garden', 'threadrings')
    expect(res.statusCode).toBe(200)
    expect(res.body.partial).toBe(true)
    expect(res.body.sections.threadrings.results).toEqual([])
  })

  test('an empty query returns empty sections', async () => {
    const res = await grouped('', 'all')
    expect(res.body).toEqual({ query: '', sections: {}, partial: false, errors: [] })
  })

  test('rejects an unknown view, type or per', async () => {
    expect((await call(searchHandler, { q: 'x', view: 'tree' })).statusCode).toBe(400)
    expect((await grouped('x', 'users,house')).statusCode).toBe(400)
    expect((await grouped('x', 'users', { per: '0' })).statusCode).toBe(400)
  })

  test('the flat view accepts a comma list of types', async () => {
    const res = await call(searchHandler, { q: 'garden', type: 'users,homes' })
    expect(res.statusCode).toBe(200)
    expect(new Set(res.body.results.map((r: any) => r.type))).toEqual(new Set(['user']))
  })
})

// ---------------------------------------------------------------- homes --

describe('pixel homes', () => {
  beforeAll(async () => {
    await reset()
    const a = await person('ana')
    await home(a, { houseTitle: 'The Mushroom Cottage', houseBoardText: 'Tea served daily', houseDescription: 'Moss on the roof' })
    const b = await person('ben', { visibility: 'private' })
    await home(b, { houseTitle: 'Mushroom Bunker' })
    const c = await person('cy')
    await home(c) // no text: never matches
    const d = await person('dee')
    await home(d, { houseTitle: 'Blocked mushroom hut' })
    await person('viewer')
    await db.userBlock.create({ data: { blockerId: d, blockedUserId: 'u_viewer' } })
  })

  const homeIds = async (q: string, viewer: string | null = null) =>
    (await grouped(q, 'homes', { per: '10' }, viewer)).body.sections.homes.results.map((r: any) => r.id)

  test('matches the title, sign board and description', async () => {
    expect(await homeIds('mushroom')).toEqual(expect.arrayContaining(['u_ana']))
    expect(await homeIds('tea')).toEqual(['u_ana'])
    expect(await homeIds('moss')).toEqual(['u_ana'])
    expect(await homeIds('mushrom cottage')).toEqual(['u_ana']) // typo, via trigram
  })

  test('respects profile visibility and blocks', async () => {
    expect(await homeIds('mushroom')).toEqual(expect.not.arrayContaining(['u_ben']))
    expect(await homeIds('mushroom', 'u_ben')).toContain('u_ben')
    expect(await homeIds('mushroom')).toContain('u_dee')
    expect(await homeIds('mushroom', 'u_viewer')).not.toContain('u_dee')
  })

  test('honours -excluded words', async () => {
    expect(await homeIds('mushroom -cottage')).not.toContain('u_ana')
  })

  test('home results link to the pixel home and carry the house', async () => {
    const res = await grouped('tea', 'homes')
    const card = res.body.sections.homes.results[0]
    expect(card).toMatchObject({
      type: 'home',
      title: 'The Mushroom Cottage',
      url: '/home/ana',
      home: { handle: 'ana', ownerName: 'ana', house: { template: 'cabin_v1', palette: 'pixel_petals' } },
    })
  })
})

// ------------------------------------------------- nothing found / surprise --

describe('nothing-found', () => {
  beforeAll(async () => {
    await reset()
    for (const h of ['h1', 'h2', 'h3', 'h4']) await home(await person(h))
    await home(await person('hidden', { visibility: 'followers' }))
  })

  test('suggests rings by single words, then falls back to the biggest rings', async () => {
    hubClient.listRings.mockImplementation(async (opts: any) => ({
      rings: opts?.search === 'weekend' ? [{ id: 'r1', slug: 'weekend', name: 'Weekend', memberCount: 4, postCount: 1 }] : [],
      total: 0,
    }))
    const near = await call(nothingFoundHandler, { q: 'weekend imrul' })
    expect(near.body.ringsAreFallback).toBe(false)
    expect(near.body.rings.map((r: any) => r.url)).toEqual(['/tr/weekend'])

    hubClient.listRings.mockImplementation(async (opts: any) => ({
      rings: opts?.search ? [] : [{ id: 'big', slug: 'big', name: 'Big ring', memberCount: 99, postCount: 5 }],
      total: 0,
    }))
    const far = await call(nothingFoundHandler, { q: 'zzqqxx' })
    expect(far.body.ringsAreFallback).toBe(true)
    expect(far.body.rings.map((r: any) => r.id)).toEqual(['big'])
  })

  test('tries the singular of a plural word', async () => {
    hubClient.listRings.mockImplementation(async (opts: any) => ({
      rings: opts?.search === 'cat' ? [{ id: 'c', slug: 'cat-lovers', name: 'Cat lovers', memberCount: 2, postCount: 0 }] : [],
      total: 0,
    }))
    const res = await call(nothingFoundHandler, { q: 'cats' })
    expect(res.body.rings.map((r: any) => r.id)).toEqual(['c'])
  })

  test('picks three random homes from public profiles only', async () => {
    const seen = new Set<string>()
    for (let i = 0; i < 6; i++) {
      const res = await call(nothingFoundHandler, { q: 'nothing' })
      expect(res.body.homes).toHaveLength(3)
      for (const h of res.body.homes) seen.add(h.id)
    }
    expect(seen.has('u_hidden')).toBe(false)
    expect([...seen].every((id) => /^u_h\d$/.test(id))).toBe(true)
  })
})

describe('surprise', () => {
  beforeAll(async () => {
    await reset()
    await home(await person('solo'), { houseTitle: 'Solo house' })
  })

  test('returns a home, ring or site preview without leaving the site unasked', async () => {
    hubClient.listRings.mockResolvedValue({ rings: [{ id: 'r', slug: 'only', name: 'Only ring', memberCount: 3, postCount: 1 }], total: 1 })
    await db.curatedSite.create({ data: { url: 'https://sadgrl.online/', title: 'Sadgrl', description: 'web revival', tags: [] } })
    const kinds = new Set<string>()
    for (let i = 0; i < 12; i++) {
      const { body } = await call(surpriseHandler, {})
      kinds.add(body.pick.kind)
      if (body.pick.kind === 'site') expect(body.pick).toMatchObject({ external: true, domain: 'sadgrl.online' })
      else expect(body.pick.external).toBe(false)
    }
    expect(kinds.size).toBeGreaterThan(1)
  })

  test('a requested kind comes first', async () => {
    const { body } = await call(surpriseHandler, { kind: 'home' })
    expect(body.pick).toMatchObject({ kind: 'home', title: 'Solo house', url: '/home/solo' })
  })

  test('rejects an unknown kind', async () => {
    expect((await call(surpriseHandler, { kind: 'planet' })).statusCode).toBe(400)
  })
})
