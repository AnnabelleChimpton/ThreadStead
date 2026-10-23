/**
 * A ring's street against a real Postgres (the hub is a fake): its members'
 * homes keep their main-street numbers, only homes the viewer may see are
 * drawn, only public rings have a street, and everyone in the ring is
 * listed under it in the walk's order.
 */
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { getRingStreet } from '@/lib/pixel-homes/ring-street'
import { getStreetRingSigns } from '@/lib/pixel-homes/street-rings'

let seq = 0
async function resident(handle: string, opts: { visibility?: Visibility; home?: boolean } = {}) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:user:${handle}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, seq++)),
      handles: { create: { handle, host: SITE_NAME } },
      profile: { create: { displayName: handle, visibility: opts.visibility ?? 'public' } },
    },
  })
  if (opts.home !== false) await db.userHomeConfig.create({ data: { userId: id } })
  await db.userDID.create({
    data: { userId: id, did: `did:test:${handle}`, userHash: `hash_${handle}`, publicKeyMultibase: 'pk', secretKeyEncrypted: 'sk' },
  })
  return id
}

// The ring "gardens": ann (1), cat (3), private dee (4), eve (5, no home),
// and someone from another instance
const members = ['ann', 'cat', 'dee', 'eve'].map((h) => `did:test:${h}`).concat('did:web:elsewhere.example')
const ROLES: Record<string, string> = { 'did:test:ann': 'owner', 'did:test:cat': 'moderator' }
const ring = { slug: 'gardens', name: 'Gardens', description: 'Growing things', visibility: 'PUBLIC' }

// Fakes: typed loosely, the federation suite checks the real shapes
function fakeHub(overrides: Record<string, unknown> = {}): any {
  return {
    getRing: jest.fn(async () => ring),
    getRingMembers: jest.fn(async () => ({
      members: members.map((actorDid) => ({
        actorDid,
        status: 'ACTIVE',
        role: ROLES[actorDid] ?? 'member',
        actorName: actorDid === 'did:web:elsewhere.example' ? 'Fen' : undefined,
        profileUrl: actorDid === 'did:web:elsewhere.example' ? 'https://elsewhere.example/~fen' : undefined,
      })),
      total: members.length,
      limit: 100,
      offset: 0,
      hasMore: false,
    })),
    ...overrides,
  }
}

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await resident('ann')
  await resident('bob')
  await resident('cat')
  await resident('dee', { visibility: 'private' })
  await resident('eve', { home: false })
})
beforeEach(() => clearCache())
afterAll(() => db.$disconnect())

const street = (hub: any, viewerId: string | null = null) =>
  getRingStreet(db, { slug: 'gardens', viewerId, host: SITE_NAME, hub })

test("members' homes keep their numbers from the main street", async () => {
  const result = await street(fakeHub())
  expect(result.kind).toBe('street')
  if (result.kind !== 'street') return
  expect(result.ring).toEqual({ slug: 'gardens', name: 'Gardens', description: 'Growing things', badgeImageUrl: null })
  // bob isn't a member, dee's profile is private, eve has no home, and the
  // member from elsewhere has no account here
  expect(result.homes.map((h) => [h.number, h.username])).toEqual([[1, 'ann'], [3, 'cat']])
})

test('everyone in the ring is listed: homes in house-number order, then the rest, with roles and own sites', async () => {
  await db.externalSite.create({ data: { id: 'site_cat', userId: 'u_cat', url: 'https://cat.example.org/', siteRef: 'cat.example.org', state: 'verified' } })
  await db.ringStop.create({ data: { ringSlug: 'gardens', externalSiteId: 'site_cat', userId: 'u_cat', status: 'listed' } })
  try {
    const result = await street(fakeHub())
    if (result.kind !== 'street') throw new Error(result.kind)
    expect(result.people.map((p) => [p.number, p.name, p.role, p.handle, p.site?.address ?? null, p.profileUrl])).toEqual([
      [1, 'ann', 'host', 'ann', null, null],
      [3, 'cat', 'moderator', 'cat', 'cat.example.org', null],
      // dee's profile is private; eve has no home; Fen is from another instance
      [null, 'eve', 'member', 'eve', null, null],
      [null, 'Fen', 'member', null, null, 'https://elsewhere.example/~fen'],
    ])
    // dee sees herself, at her number
    const asDee = await street(fakeHub(), 'u_dee')
    expect(asDee.kind === 'street' && asDee.people.map((p) => p.name)).toEqual(['ann', 'cat', 'dee', 'eve', 'Fen'])
  } finally {
    await db.ringStop.deleteMany({})
    await db.externalSite.deleteMany({})
  }
})

test('a member who may see a private home sees it on the street', async () => {
  const result = await street(fakeHub(), 'u_dee')
  expect(result.kind === 'street' && result.homes.map((h) => h.username)).toEqual(['ann', 'cat', 'dee'])
})

test('private, missing and unlisted rings have no street', async () => {
  const missing = fakeHub({
    getRing: jest.fn(async () => null),
    getRingMembers: jest.fn(async () => {
      throw new RingHubClientError('Not found', 404)
    }),
  })
  expect(await street(missing)).toEqual({ kind: 'none' })
  expect(await street(fakeHub({ getRing: jest.fn(async () => ({ ...ring, visibility: 'UNLISTED' })) }))).toEqual({
    kind: 'none',
  })
})

test("a hub that doesn't answer in time is said so, not drawn as an empty street", async () => {
  const slow = fakeHub({ getRing: jest.fn(() => new Promise(() => {})) })
  expect(await getRingStreet(db, { slug: 'gardens', viewerId: null, host: SITE_NAME, hub: slow, deadlineMs: 50 })).toEqual({
    kind: 'unavailable',
  })
})

test("a ring's street doesn't put up a sign for itself", async () => {
  const homes = [{ userId: 'u_ann', number: 1 }, { userId: 'u_cat', number: 3 }]
  const hub: any = {
    getActorBadges: jest.fn(async () => ({
      badges: ['gardens', 'knitting'].map((slug) => ({
        badge: { id: slug },
        ring: { slug, name: slug, visibility: 'PUBLIC' },
        membership: { role: 'member', joinedAt: null, status: 'ACTIVE' },
        issuedAt: 'x',
        isRevoked: false,
        revokedAt: null,
        revocationReason: null,
      })),
      total: 2,
      limit: 100,
      offset: 0,
      hasMore: false,
    })),
    getRing: jest.fn(async (slug: string) => ({ slug, visibility: 'PUBLIC', badgeImageUrl: null })),
  }
  const signs = await getStreetRingSigns(db, homes, { hub, exceptSlugs: ['gardens'] })
  expect(signs.map((s) => s.slug)).toEqual(['knitting'])
})
