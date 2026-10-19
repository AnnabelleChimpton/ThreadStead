/**
 * Ring signposts on the street: which rings get a sign and where, and how
 * the street treats the hub (cache, deadline, failures). The hub is a fake
 * here; tests/federation/street-rings.itest.ts runs the reads for real.
 */
jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

import { clearCache } from '@/lib/api/ringhub/ringhub-cache'
import {
  MAX_RING_SIGNS,
  getStreetRingSigns,
  planRingSigns,
  publicRingsOf,
  type RingRef,
} from '../street-rings'

const homes = [
  { userId: 'u1', number: 1 },
  { userId: 'u2', number: 2 },
  { userId: 'u3', number: 3 },
  { userId: 'u4', number: 4 },
]
const ring = (slug: string): RingRef => ({ slug, name: slug.replace(/-/g, ' ') })

describe('planRingSigns', () => {
  it('a ring needs two residents of the street, and stands after the first one', () => {
    const plan = planRingSigns(homes, new Map([
      ['u2', [ring('gardens'), ring('solo')]],
      ['u4', [ring('gardens')]],
    ]))
    expect(plan).toEqual([{ slug: 'gardens', name: 'gardens', afterUserId: 'u2', afterNumber: 2, membersHere: 2 }])
  })

  it('leaves out rings the viewer blocked', () => {
    const rings = new Map([['u1', [ring('a')]], ['u2', [ring('a')]]])
    expect(planRingSigns(homes, rings, new Set(['a']))).toEqual([])
  })

  it(`keeps at most ${MAX_RING_SIGNS}, the ones with most residents here, in street order`, () => {
    const many = ['r1', 'r2', 'r3', 'r4', 'r5'].map(ring)
    const rings = new Map([
      ['u1', many],
      ['u2', many.slice(0, 4)],
      ['u3', [many[4], many[3]]],
      ['u4', [many[3]]],
    ])
    const plan = planRingSigns(homes, rings)
    expect(plan).toHaveLength(MAX_RING_SIGNS)
    expect(plan[0]).toMatchObject({ slug: 'r1', afterUserId: 'u1' })
    expect(plan.find((p) => p.slug === 'r4')!.membersHere).toBe(4)
    expect(plan.map((p) => p.afterNumber)).toEqual([...plan.map((p) => p.afterNumber)].sort((a, b) => a - b))
  })
})

// ------------------------------------------------------------ the hub --

const did = (u: string) => `did:test:${u}`
function fakeDb(userIds = homes.map((h) => h.userId), blockedSlugs: string[] = []) {
  return {
    userDID: { findMany: jest.fn(async () => userIds.map((userId) => ({ userId, did: did(userId) }))) },
    userBlock: { findMany: jest.fn(async () => blockedSlugs.map((slug) => ({ blockedThreadRing: { slug } }))) },
  } as any
}
const badge = (slug: string, extra: Record<string, any> = {}) => ({
  badge: { id: 'b' },
  ring: { slug, name: slug, visibility: 'PUBLIC' },
  membership: { role: 'member', joinedAt: null, status: 'ACTIVE' },
  issuedAt: '2026-01-01',
  isRevoked: false,
  revokedAt: null,
  revocationReason: null,
  ...extra,
})
function fakeHub(byUser: Record<string, any[]>, rings: Record<string, any> = {}) {
  return {
    getActorBadges: jest.fn(async (d: string) => {
      const badges = byUser[d.replace('did:test:', '')] ?? []
      return { badges, total: badges.length, limit: 100, offset: 0, hasMore: false }
    }),
    getRing: jest.fn(async (slug: string) =>
      slug in rings ? rings[slug] : { slug, visibility: 'PUBLIC', badgeImageUrl: `https://hub.test/${slug}.png` }
    ),
  }
}

beforeEach(() => clearCache())

describe('publicRingsOf', () => {
  it('keeps active badges of PUBLIC rings only', async () => {
    const hub = fakeHub({
      u1: [
        badge('open'),
        badge('hidden', { ring: { slug: 'hidden', name: 'hidden', visibility: 'UNLISTED' } }),
        badge('secret', { ring: { slug: 'secret', name: 'secret', visibility: 'PRIVATE' } }),
        badge('gone', { isRevoked: true }),
        badge('waiting', { membership: { role: null, joinedAt: null, status: 'PENDING' } }),
      ],
    })
    expect(await publicRingsOf(hub, did('u1'))).toEqual([{ slug: 'open', name: 'open' }])
  })
})

describe('getStreetRingSigns', () => {
  it('signs a shared public ring with its badge, asking the hub once per resident', async () => {
    const hub = fakeHub({ u1: [badge('gardens')], u3: [badge('gardens')] })
    const signs = await getStreetRingSigns(fakeDb(), homes, { hub })
    expect(signs).toEqual([
      { slug: 'gardens', name: 'gardens', afterUserId: 'u1', afterNumber: 1, membersHere: 2, badgeImageUrl: 'https://hub.test/gardens.png' },
    ])
    expect(hub.getActorBadges).toHaveBeenCalledTimes(4)
    expect(hub.getActorBadges).toHaveBeenCalledWith(did('u1'), { status: 'active', limit: 100 })
  })

  it('a second street view is served from the cache', async () => {
    const hub = fakeHub({ u1: [badge('gardens')], u3: [badge('gardens')] })
    await getStreetRingSigns(fakeDb(), homes, { hub })
    await getStreetRingSigns(fakeDb(), homes, { hub })
    expect(hub.getActorBadges).toHaveBeenCalledTimes(4)
    expect(hub.getRing).toHaveBeenCalledTimes(1)
  })

  it('a ring with no badge image gets a sign drawn from its name', async () => {
    const hub = fakeHub({ u1: [badge('plain')], u2: [badge('plain')] }, { plain: { slug: 'plain', visibility: 'PUBLIC' } })
    const [sign] = await getStreetRingSigns(fakeDb(), homes, { hub })
    expect(sign.badgeImageUrl).toBeNull()
  })

  it('a ring the hub now says is private, or gone, loses its sign', async () => {
    const hub = fakeHub(
      { u1: [badge('went-private'), badge('deleted')], u2: [badge('went-private'), badge('deleted')] },
      { 'went-private': { slug: 'went-private', visibility: 'PRIVATE' }, deleted: null }
    )
    expect(await getStreetRingSigns(fakeDb(), homes, { hub })).toEqual([])
  })

  it('rings the viewer blocked get no sign', async () => {
    const hub = fakeHub({ u1: [badge('gardens')], u2: [badge('gardens')] })
    expect(await getStreetRingSigns(fakeDb(undefined, ['gardens']), homes, { hub, viewerId: 'u_viewer' })).toEqual([])
  })

  it('a hub that is down means no signs, not an error', async () => {
    const hub = { getActorBadges: jest.fn(async () => { throw new Error('ECONNREFUSED') }), getRing: jest.fn() }
    await expect(getStreetRingSigns(fakeDb(), homes, { hub })).resolves.toEqual([])
    expect(hub.getRing).not.toHaveBeenCalled()
  })

  it('a slow hub is given up on at the deadline, and its answers fill the cache for next time', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const slow = fakeHub({ u1: [badge('gardens')], u2: [badge('gardens')] })
    const hub = {
      getActorBadges: jest.fn(async (d: string) => { await gate; return slow.getActorBadges(d) }),
      getRing: slow.getRing,
    }
    const started = Date.now()
    expect(await getStreetRingSigns(fakeDb(), homes, { hub, deadlineMs: 50 })).toEqual([])
    expect(Date.now() - started).toBeLessThan(1000)

    release()
    await new Promise((r) => setTimeout(r, 0))
    const later = await getStreetRingSigns(fakeDb(), homes, { hub, deadlineMs: 50 })
    expect(later.map((s) => s.slug)).toEqual(['gardens'])
    expect(hub.getActorBadges).toHaveBeenCalledTimes(4)
  })

  it('no hub configured, too few homes, or residents who never joined a ring: no hub calls at all', async () => {
    const hub = fakeHub({})
    expect(await getStreetRingSigns(fakeDb(), homes, { hub: null })).toEqual([])
    expect(await getStreetRingSigns(fakeDb(), homes.slice(0, 1), { hub })).toEqual([])
    expect(await getStreetRingSigns(fakeDb(['u1']), homes, { hub })).toEqual([])
    expect(hub.getActorBadges).not.toHaveBeenCalled()
  })
})
