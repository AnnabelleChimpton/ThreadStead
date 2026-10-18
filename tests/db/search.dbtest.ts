/**
 * GET /api/search against a real Postgres (Phase 1: full-text + trigram).
 *
 * The route runs raw SQL, so these tests use a throwaway database built by
 * tests/db/global-setup.ts (schema.prisma + the search migration's triggers).
 * Only the session lookup and RingHub are mocked.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { allowedVisibilities } from '@/lib/domain/posts/visibility'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({ getThreadRingSystem: () => 'ringhub' }))
const hubClient = { listRings: jest.fn(async () => ({ rings: [] as any[] })) }
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn(() => hubClient) }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(() => hubClient),
}))

import handler from '@/pages/api/search'
import { getSessionUser } from '@/lib/auth/server'

// ------------------------------------------------------------- fixtures --

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE "User", "CustomPage", "ThreadRing" RESTART IDENTITY CASCADE'
  )
}

let seq = 0
async function person(
  handle: string,
  opts: { displayName?: string | null; bio?: string; visibility?: Visibility; noProfile?: boolean } = {}
) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      handles: { create: { handle, host: 'local' } },
      ...(opts.noProfile
        ? {}
        : {
            profile: {
              create: {
                displayName: opts.displayName === undefined ? handle : opts.displayName,
                bio: opts.bio ?? null,
                visibility: opts.visibility ?? 'public',
              },
            },
          }),
    },
  })
  return id
}

async function post(
  id: string,
  authorId: string,
  data: {
    title?: string
    bodyText?: string
    bodyHtml?: string
    bodyMarkdown?: string
    tags?: string[]
    visibility?: Visibility
    platform?: string
    createdAt?: Date
  } = {}
) {
  await db.post.create({ data: { id, authorId, title: 'Untitled Post', ...data } })
  return id
}

async function follow(follower: string, followee: string, status = 'accepted') {
  await db.follow.create({ data: { followerId: follower, followeeId: followee, status } })
}

async function ring(slug: string, curatorId: string, memberIds: string[]) {
  const r = await db.threadRing.create({
    data: { id: `r_${slug}`, uri: `https://hub.test/rings/${slug}`, slug, name: slug, curatorId },
  })
  for (const userId of memberIds) await db.threadRingMember.create({ data: { threadRingId: r.id, userId } })
  return r.id
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

async function ids(query: Record<string, string>, viewer: string | null = null) {
  const res = await call(query, viewer)
  expect(res.statusCode).toBe(200)
  return res.body.results.map((r: any) => r.id) as string[]
}

beforeEach(() => {
  hubClient.listRings.mockClear()
})

afterAll(async () => {
  await db.$disconnect()
})

// ---------------------------------------------------------------- matching --

describe('text matching', () => {
  beforeAll(async () => {
    await reset()
    const a = await person('writer', { displayName: 'Imrul Hassan', bio: 'Internet angel and weekend gardener' })
    await post('weekend', a, { title: 'A weekend with Imrul', bodyText: 'We went to the coast.' })
    await post('dnd', a, { title: 'Dungeons and dragons night', bodyText: 'Rolled a natural twenty.' })
    await post('flea', a, { title: 'Saturday', bodyText: 'Found floppies at the flea market today.' })
    await post('fleas', a, { title: 'Sunday', bodyText: 'The market was full of fleas, the dog too.' })
    await post('garden', a, { title: 'Garden update', bodyText: 'Tomatoes and beans are up.' })
    await post('garden2', a, { title: 'Garden plans', bodyText: 'More beans next year.' })
    await post('tagged', a, { title: 'Misc', bodyText: 'nothing here', tags: ['Knitting'] })
    await post('md', a, { title: 'Markdown', bodyMarkdown: 'A [link](https://x.y/href) and ![pic](https://x.y/IMG_1.png)&nbsp;ok' })
    await post('html', a, { title: 'Html', bodyHtml: '<p><a href="https://x.y">lighthouse</a>&nbsp;visit</p>' })
  })

  test('multi-word queries match words in any order and across fields', async () => {
    expect(await ids({ q: 'imrul weekend', type: 'posts' })).toEqual(['weekend'])
    expect(await ids({ q: 'weekend imrul', type: 'posts' })).toEqual(['weekend'])
    expect(await ids({ q: 'angel internet', type: 'users' })).toEqual(['u_writer'])
    // "and" is a stopword; "dragons" stems to match "dragon"
    expect(await ids({ q: 'dragon dungeons', type: 'posts' })).toEqual(['dnd'])
  })

  test('quoted phrases match only that phrase', async () => {
    expect(await ids({ q: '"flea market"', type: 'posts' })).toEqual(['flea'])
    expect((await ids({ q: 'flea market', type: 'posts' })).sort()).toEqual(['flea', 'fleas'])
  })

  test('-word excludes', async () => {
    expect((await ids({ q: 'garden', type: 'posts' })).sort()).toEqual(['garden', 'garden2'])
    expect(await ids({ q: 'garden -tomatoes', type: 'posts' })).toEqual(['garden2'])
    // the title-trigram path must not bring an excluded post back
    expect(await ids({ q: 'garden -update', type: 'posts' })).toEqual(['garden2'])
    expect(await ids({ q: 'gardener -weekend', type: 'users' })).toEqual([])
  })

  test('a quoted phrase is not fuzzed into near-miss titles', async () => {
    await post('fleatitle', 'u_writer', { title: 'Market of the fleas', bodyText: 'stalls' })
    expect(await ids({ q: '"flea market"', type: 'posts' })).toEqual(['flea'])
    await db.post.delete({ where: { id: 'fleatitle' } })
  })

  test('tags are searchable', async () => {
    expect(await ids({ q: 'knitting', type: 'posts' })).toEqual(['tagged'])
  })

  test('posts written as markdown/HTML are searchable via the derived bodyText, markup is not', async () => {
    expect(await ids({ q: 'lighthouse', type: 'posts' })).toEqual(['html'])
    expect(await ids({ q: 'href', type: 'posts' })).toEqual([])
    expect(await ids({ q: 'nbsp', type: 'posts' })).toEqual([])
    const derived = await db.post.findUnique({ where: { id: 'md' }, select: { bodyText: true } })
    expect(derived?.bodyText).toBe('A link and ok')
  })

  test('excerpts centre on a matching word for multi-word queries', async () => {
    const res = await call({ q: 'coast weekend', type: 'posts' })
    expect(res.body.results[0].description).toBe('We went to the coast.')
  })

  test('punctuation, operators and SQL in the query are just text', async () => {
    for (const q of ["'; DROP TABLE \"Post\"; --", '%', '_', '\\', '"', '-', '(', 'a & b | !c', ':*']) {
      const res = await call({ q })
      expect(res.statusCode).toBe(200)
    }
    expect(await db.post.count()).toBeGreaterThan(0)
    expect(await ids({ q: '%', type: 'users' })).toEqual([])
  })
})

describe('typos, partial names and accents', () => {
  beforeAll(async () => {
    await reset()
    await person('ghostie42', { displayName: 'Ghost Writer' })
    await person('nora_q', { displayName: 'Nora Quill' })
    await person('zoe', { displayName: 'Zoë Café' })
    await person('bob', { displayName: 'Bob' })
    const a = await person('poster', { displayName: 'P' })
    await post('writing', a, { title: 'On writing every day' })
    await post('cafe', a, { title: 'Crème brûlée at the café' })
  })

  test('partial handles and names', async () => {
    expect(await ids({ q: 'ghostie', type: 'users' })).toEqual(['u_ghostie42'])
    expect(await ids({ q: 'nor', type: 'users' })).toEqual(['u_nora_q'])
    expect(await ids({ q: 'quil', type: 'users' })).toEqual(['u_nora_q'])
    // 1–2 characters: prefix match
    expect(await ids({ q: 'gh', type: 'users' })).toEqual(['u_ghostie42'])
  })

  test('typos in titles and names', async () => {
    expect(await ids({ q: 'writting', type: 'posts' })).toEqual(['writing'])
    expect(await ids({ q: 'ghostei', type: 'users' })).toContain('u_ghostie42')
  })

  test('accents are ignored both ways', async () => {
    expect(await ids({ q: 'zoe cafe', type: 'users' })).toEqual(['u_zoe'])
    expect(await ids({ q: 'Zoë', type: 'users' })).toEqual(['u_zoe'])
    expect(await ids({ q: 'creme brulee', type: 'posts' })).toEqual(['cafe'])
    expect(await ids({ q: 'café', type: 'posts' })).toEqual(['cafe'])
  })

  test('@handle works', async () => {
    expect(await ids({ q: '@nora_q', type: 'users' })).toEqual(['u_nora_q'])
  })
})

// ----------------------------------------------------------------- privacy --

describe('privacy', () => {
  // owner has one post and a profile per visibility; viewers stand in every
  // relationship to them.
  const VIS: Visibility[] = ['public', 'followers', 'friends', 'private']
  let owner: string
  const viewers: Record<string, string | null> = {}

  beforeAll(async () => {
    await reset()
    owner = await person('owner', { displayName: 'Owner' })
    for (const v of VIS) {
      await post(`post_${v}`, owner, { title: `Lighthouse ${v}`, visibility: v })
      await person(`prof_${v}`, { displayName: `Keeper ${v}`, bio: 'lighthouse keeper', visibility: v })
    }
    viewers.anonymous = null
    viewers.stranger = await person('stranger')
    viewers.follower = await person('follower')
    viewers.friend = await person('friend')
    viewers.pending = await person('pending')
    viewers.followedOnly = await person('followed_only')
    for (const target of [owner, ...VIS.map((v) => `u_prof_${v}`)]) {
      await follow(viewers.follower!, target)
      await follow(viewers.friend!, target)
      await follow(target, viewers.friend!)
      await follow(viewers.pending!, target, 'pending')
      await follow(target, viewers.followedOnly!) // they follow the viewer, not the reverse
    }
  })

  const relationships = {
    anonymous: { isAuthor: false, isFollower: false, isFriend: false },
    stranger: { isAuthor: false, isFollower: false, isFriend: false },
    follower: { isAuthor: false, isFollower: true, isFriend: false },
    friend: { isAuthor: false, isFollower: true, isFriend: true },
    pending: { isAuthor: false, isFollower: false, isFriend: false },
    followedOnly: { isAuthor: false, isFollower: false, isFriend: false },
  }

  test.each(Object.keys(relationships))('posts seen by a %s match lib/domain/posts/visibility.ts', async (who) => {
    const expected = allowedVisibilities(relationships[who as keyof typeof relationships]).map((v) => `post_${v}`)
    expect((await ids({ q: 'lighthouse', type: 'posts' }, viewers[who])).sort()).toEqual(expected.sort())
  })

  test.each(Object.keys(relationships))('profiles seen by a %s follow the same rules', async (who) => {
    const expected = allowedVisibilities(relationships[who as keyof typeof relationships]).map((v) => `u_prof_${v}`)
    expect((await ids({ q: 'lighthouse keeper', type: 'users' }, viewers[who])).sort()).toEqual(expected.sort())
  })

  test('the author sees all their own posts, and you always find your own profile', async () => {
    expect((await ids({ q: 'lighthouse', type: 'posts' }, owner)).sort()).toEqual(VIS.map((v) => `post_${v}`).sort())
    expect(await ids({ q: 'keeper private', type: 'users' }, 'u_prof_private')).toEqual(['u_prof_private'])
  })

  test('a private profile never leaks its bio to others', async () => {
    const res = await call({ q: 'keeper' }, viewers.friend)
    expect(JSON.stringify(res.body)).not.toContain('u_prof_private')
  })

  test('users without a profile row are public', async () => {
    await person('bare', { noProfile: true })
    expect(await ids({ q: 'bare', type: 'users' })).toEqual(['u_bare'])
  })

  test('comment-only shadows of RingHub posts never match', async () => {
    await post('shadow', owner, { title: 'External Post', bodyText: 'lighthouse', platform: 'ringhub' })
    expect(await ids({ q: 'lighthouse', type: 'posts' })).not.toContain('shadow')
  })
})

// ------------------------------------------------------------------ blocks --

describe('blocks', () => {
  beforeAll(async () => {
    await reset()
    await person('me')
    await person('nice', { bio: 'knitting' })
    await person('rude', { bio: 'knitting' })
    await person('grumpy', { bio: 'knitting' })
    await post('p_nice', 'u_nice', { title: 'Knitting socks' })
    await post('p_rude', 'u_rude', { title: 'Knitting hats' })
    await post('p_grumpy', 'u_grumpy', { title: 'Knitting scarves' })
    await post('p_ring', 'u_nice', { title: 'Knitting in a ring' })
    const blockedRing = await ring('yarn', 'u_nice', ['u_nice'])
    await db.postThreadRing.create({ data: { postId: 'p_ring', threadRingId: blockedRing, addedBy: 'u_nice' } })
    await db.userBlock.create({ data: { blockerId: 'u_me', blockedUserId: 'u_rude' } })
    await db.userBlock.create({ data: { blockerId: 'u_grumpy', blockedUserId: 'u_me' } })
    await db.userBlock.create({ data: { blockerId: 'u_me', blockedThreadRingId: blockedRing } })
  })

  test('people you blocked and people who blocked you are both left out', async () => {
    expect(await ids({ q: 'knitting', type: 'users' }, 'u_me')).toEqual(['u_nice'])
    expect((await ids({ q: 'knitting', type: 'posts' }, 'u_me'))).toEqual(['p_nice'])
  })

  test('posts in a ring you blocked are left out', async () => {
    expect(await ids({ q: 'ring', type: 'posts' }, 'u_me')).toEqual([])
  })

  test('other viewers are unaffected', async () => {
    expect((await ids({ q: 'knitting', type: 'users' }, 'u_nice')).sort()).toEqual(['u_grumpy', 'u_nice', 'u_rude'])
    expect((await ids({ q: 'knitting', type: 'posts' })).sort()).toEqual(['p_grumpy', 'p_nice', 'p_ring', 'p_rude'])
  })
})

// ----------------------------------------------------------------- ranking --

describe('ranking', () => {
  beforeAll(async () => {
    await reset()
    await person('home', { displayName: 'Sam' })
    for (let i = 0; i < 30; i++) await person(`homebody${i}`, { displayName: `Home ${i}`, bio: 'my home page' })
    const author = await person('author')
    const friendly = await person('friendly')
    const viewer = await person('viewer')
    await follow(viewer, friendly)
    await post('old_exact', author, { title: 'Love', createdAt: new Date('2020-01-01') })
    for (let i = 0; i < 30; i++) await post(`newer${i}`, author, { title: `Post ${i}`, bodyText: 'I love this' })
    await post('stranger_soup', author, { title: 'Soup recipe', createdAt: new Date('2026-01-01') })
    await post('friend_soup', friendly, { title: 'Soup recipe', createdAt: new Date('2026-01-01') })
  })

  test('an exact @handle match is pinned first, ahead of fuller name/bio matches', async () => {
    const res = await call({ q: 'home' })
    expect(res.body.results[0].id).toBe('u_home')
    expect(res.body.results[0].relevanceScore).toBeGreaterThanOrEqual(100)
  })

  test('an old exact-title post beats many newer body matches', async () => {
    expect((await ids({ q: 'love', type: 'posts' }))[0]).toBe('old_exact')
  })

  test('posts by people you follow rank higher', async () => {
    expect((await ids({ q: 'soup', type: 'posts' }, 'u_viewer'))[0]).toBe('friend_soup')
  })

  test('response keeps the shape the search page reads', async () => {
    const res = await call({ q: 'love', type: 'posts', limit: '1' })
    expect(Object.keys(res.body).sort()).toEqual(['errors', 'nextCursor', 'partial', 'query', 'results', 'total', 'type'])
    // As sent over the wire (an undefined description is dropped).
    const [first] = JSON.parse(JSON.stringify(res.body.results))
    // `post` is the card's own fields (Phase 2); `meta` stays for older callers.
    expect(Object.keys(first).sort()).toEqual(['id', 'meta', 'post', 'relevanceScore', 'title', 'type', 'url'])
    expect(res.body.results[0].url).toBe('/resident/author/post/old_exact')
  })
})

// -------------------------------------------------------------- pagination --

describe('cursor pagination', () => {
  beforeAll(async () => {
    await reset()
    const a = await person('author')
    for (let i = 0; i < 45; i++) {
      await post(`pg${String(i).padStart(2, '0')}`, a, {
        title: `Paging test ${i}`,
        bodyText: 'tide '.repeat(1 + (i % 4)),
        createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
      })
    }
  })

  async function walk(limit: number, between?: () => Promise<void>) {
    const seen: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const res: any = await call({ q: 'tide', type: 'posts', limit: String(limit), ...(cursor ? { cursor } : {}) })
      expect(res.statusCode).toBe(200)
      seen.push(...res.body.results.map((r: any) => r.id))
      cursor = res.body.nextCursor
      pages++
      if (between && pages === 1) await between()
    } while (cursor && pages < 20)
    return { seen, pages }
  }

  test('walking pages returns every match once, in the same order as one big page', async () => {
    const all = await ids({ q: 'tide', type: 'posts', limit: '50' })
    expect(all).toHaveLength(45)
    const { seen, pages } = await walk(10)
    expect(pages).toBe(5)
    expect(seen).toEqual(all)
  })

  test('rows added between pages do not cause repeats', async () => {
    const { seen } = await walk(10, async () => {
      await post('late', 'u_author', { title: 'Tide tide tide', bodyText: 'tide tide tide tide' })
    })
    expect(new Set(seen).size).toBe(seen.length)
    await db.post.delete({ where: { id: 'late' } })
  })

  test('the last page has no nextCursor', async () => {
    const res = await call({ q: 'tide', type: 'posts', limit: '50' })
    expect(res.body.nextCursor).toBeNull()
  })

  test('a malformed cursor is a 400', async () => {
    for (const cursor of ['nope', Buffer.from('{"t":1}').toString('base64url')]) {
      const res = await call({ q: 'tide', cursor })
      expect(res.statusCode).toBe(400)
      expect(res.body.error).toMatch(/cursor/)
    }
  })

  test('limit is clamped to 50', async () => {
    const res = await call({ q: 'tide', type: 'posts', limit: '500' })
    expect(res.body.results).toHaveLength(45)
    expect((await call({ q: 'tide', type: 'posts', limit: '5' })).body.results).toHaveLength(5)
  })
})

// ---------------------------------------------------------------- pages --

describe('custom pages', () => {
  beforeAll(async () => {
    await reset()
    await db.customPage.create({ data: { slug: 'about', title: 'About the town', content: '<h1>Welcome</h1><p>The neighbourhood guide.</p>', published: true } })
    await db.customPage.create({ data: { slug: 'secret', title: 'Secret plans', content: 'neighbourhood guide draft', published: false } })
  })

  test('published pages match; drafts never do', async () => {
    const res = await call({ q: 'neighbourhood guide' })
    expect(res.body.results.map((r: any) => r.url)).toEqual(['/page/about'])
    expect(res.body.results[0]).toMatchObject({ type: 'page', title: 'About the town', description: 'Welcome The neighbourhood guide.' })
  })

  test('publishing and unpublishing update the index', async () => {
    await db.customPage.update({ where: { slug: 'secret' }, data: { published: true } })
    expect(await ids({ q: 'secret', type: 'pages' })).toHaveLength(1)
    await db.customPage.update({ where: { slug: 'secret' }, data: { published: false } })
    expect(await ids({ q: 'secret', type: 'pages' })).toEqual([])
  })
})

// ------------------------------------------------------------------ rings --

describe('rings blend with local results', () => {
  beforeAll(async () => {
    await reset()
    const a = await person('author')
    await post('cats_post', a, { title: 'My cats', bodyText: 'they sleep' })
  })

  test('an exact ring name match is pinned above post mentions', async () => {
    hubClient.listRings.mockResolvedValueOnce({
      rings: [{ id: 'hub-cats', slug: 'cats', name: 'Cats', description: 'cats!', memberCount: 3, postCount: 9 }],
    })
    const res = await call({ q: 'cats' })
    expect(res.body.results.map((r: any) => r.id)).toEqual(['hub-cats', 'cats_post'])
    expect(res.body.results[0].url).toBe('/tr/cats')
  })

  test('a hub failure still returns local results, marked partial', async () => {
    hubClient.listRings.mockRejectedValueOnce(new Error('hub down'))
    const res = await call({ q: 'cats' })
    expect(res.body.partial).toBe(true)
    expect(res.body.results.map((r: any) => r.id)).toEqual(['cats_post'])
  })
})
