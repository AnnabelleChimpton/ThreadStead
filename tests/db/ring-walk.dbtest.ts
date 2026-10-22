/**
 * Ring signposts against a real Postgres (the hub is a fake): the walk goes
 * through a ring's member homes in house-number order, only to homes the
 * viewer may see; the street's signs count only the homes it was given.
 */
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { walkTarget } from '@/lib/pixel-homes/ring-walk'
import { getStreetPage, houseNumbersOf } from '@/lib/pixel-homes/street'
import { getStreetRingSigns } from '@/lib/pixel-homes/street-rings'

let seq = 0
async function resident(handle: string, opts: { visibility?: Visibility; home?: boolean; did?: boolean } = {}) {
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
  if (opts.did !== false) {
    await db.userDID.create({
      data: { userId: id, did: `did:test:${handle}`, userHash: `hash_${handle}`, publicKeyMultibase: 'pk', secretKeyEncrypted: 'sk' },
    })
  }
  return id
}

// The ring "gardens": ann (1), cat (3), private dee (4), eve (5, no home)
const members = ['ann', 'cat', 'dee', 'eve'].map((h) => `did:test:${h}`)
// Fakes: typed loosely, the federation suite checks the real shapes
const hub: any = {
  getRingMembers: jest.fn(async () => ({
    members: members.map((actorDid) => ({ actorDid, status: 'ACTIVE' })),
    total: members.length,
    limit: 100,
    offset: 0,
    hasMore: false,
  })),
}
const badgesFor = (dids: string[]): any => ({
  getActorBadges: jest.fn(async (d: string) => {
    const badges = dids.includes(d)
      ? [{ badge: { id: 'b' }, ring: { slug: 'gardens', name: 'Gardens', visibility: 'PUBLIC' }, membership: { role: 'member', joinedAt: null, status: 'ACTIVE' }, issuedAt: 'x', isRevoked: false, revokedAt: null, revocationReason: null }]
      : []
    return { badges, total: badges.length, limit: 100, offset: 0, hasMore: false }
  }),
  getRing: jest.fn(async () => ({ slug: 'gardens', visibility: 'PUBLIC', badgeImageUrl: 'https://hub.test/g.png' })),
})

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await resident('ann')
  await resident('bob')
  await resident('cat')
  await resident('dee', { visibility: 'private' })
  await resident('eve', { home: false })
  await resident('fay')
})
beforeEach(() => clearCache())
afterAll(() => db.$disconnect())

const walk = (from: number, go: 'next' | 'prev' | 'random', viewerId: string | null = null) =>
  walkTarget(db, { slug: 'gardens', from, go, viewerId, host: SITE_NAME, hub, random: () => 0 })

test('house numbers follow join order, and leave out residents without a home', async () => {
  const numbers = await houseNumbersOf(db, ['u_ann', 'u_cat', 'u_eve', 'u_fay'], SITE_NAME)
  expect(Object.fromEntries(numbers)).toEqual({ u_ann: 1, u_cat: 3, u_fay: 5 })
})

test('next and prev walk the member homes in street order, wrapping round', async () => {
  expect(await walk(1, 'next')).toEqual({ kind: 'home', handle: 'cat' })
  expect(await walk(3, 'next')).toEqual({ kind: 'home', handle: 'ann' })
  expect(await walk(1, 'prev')).toEqual({ kind: 'home', handle: 'ann' })
  expect(await walk(2, 'prev')).toEqual({ kind: 'home', handle: 'ann' })
  expect(await walk(0, 'prev')).toEqual({ kind: 'home', handle: 'cat' })
  // Random never lands where you are
  expect(await walk(1, 'random')).toEqual({ kind: 'home', handle: 'cat' })
})

test('a member home the viewer may not see is skipped; its owner can walk to it', async () => {
  // dee is private and house number 4
  expect(await walk(3, 'next')).toEqual({ kind: 'home', handle: 'ann' })
  expect(await walk(3, 'next', 'u_dee')).toEqual({ kind: 'home', handle: 'dee' })
})

test('a block either way hides a member home from the walk', async () => {
  await db.userBlock.create({ data: { blockerId: 'u_cat', blockedUserId: 'u_fay' } })
  expect(await walk(1, 'next', 'u_fay')).toEqual({ kind: 'home', handle: 'ann' })
  await db.userBlock.deleteMany({})
})

test('a ring the hub has no public copy of, or no answer in time', async () => {
  const missing: any = { getRingMembers: jest.fn(async () => { throw new RingHubClientError('nf', 404) }) }
  expect(await walkTarget(db, { slug: 'secret', from: 1, go: 'next', viewerId: null, host: SITE_NAME, hub: missing })).toEqual({ kind: 'none' })
  const hanging: any = { getRingMembers: jest.fn(() => new Promise<never>(() => {})) }
  expect(await walkTarget(db, { slug: 'slow', from: 1, go: 'next', viewerId: null, host: SITE_NAME, hub: hanging, deadlineMs: 50 })).toEqual({ kind: 'unavailable' })
})

test('the street only counts the homes this viewer sees: a private member makes no sign for strangers', async () => {
  const hubBadges = badgesFor(['did:test:ann', 'did:test:dee'])
  const asGuest = await getStreetPage(db, { index: 0, viewerId: null, host: SITE_NAME })
  expect(await getStreetRingSigns(db, asGuest.homes, { hub: hubBadges })).toEqual([])
  clearCache()
  const asDee = await getStreetPage(db, { index: 0, viewerId: 'u_dee', host: SITE_NAME })
  const signs = await getStreetRingSigns(db, asDee.homes, { hub: hubBadges, viewerId: 'u_dee' })
  expect(signs).toEqual([expect.objectContaining({ slug: 'gardens', afterUserId: 'u_ann', afterNumber: 1, membersHere: 2 })])
})

test('a ring the viewer blocked gets no sign', async () => {
  const ring = await db.threadRing.create({ data: { slug: 'gardens', name: 'Gardens', curatorId: 'u_bob', uri: 'https://hub.test/rings/gardens' } })
  await db.userBlock.create({ data: { blockerId: 'u_bob', blockedThreadRingId: ring.id } })
  const hubBadges = badgesFor(['did:test:ann', 'did:test:cat'])
  const street = await getStreetPage(db, { index: 0, viewerId: 'u_bob', host: SITE_NAME })
  expect(await getStreetRingSigns(db, street.homes, { hub: hubBadges, viewerId: 'u_bob' })).toEqual([])
  clearCache()
  expect(await getStreetRingSigns(db, street.homes, { hub: hubBadges, viewerId: null })).toHaveLength(1)
})
