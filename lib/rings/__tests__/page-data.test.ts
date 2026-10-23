/**
 * @jest-environment node
 *
 * The ring page's loader reads the ring from the hub only: signed as the
 * viewer (so a private ring's members see it), unsigned when there's no
 * viewer or their key is the problem. A hub 404 is a 404, and a slow hub is
 * served what the cache kept, never the local mirror row (whose name,
 * policies and description are placeholders).
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    user: { findMany: jest.fn(async ({ where }: any) => where.AND[0].id.in.map((id: string) => ({ id, primaryHandle: 'sam@HomePageAgain', profile: { displayName: 'Sam' } }))) },
    threadRing: { findUnique: jest.fn() },
  },
}))
jest.mock('@/lib/api/did/server-did-client', () => ({
  mapDIDsToUserIds: jest.fn(async (dids: string[]) => new Map(dids.map((did) => [did, `user-of-${did}`]))),
}))
jest.mock('@/lib/domain/users/profile-access', () => ({ visibleResidentWhere: () => ({}) }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn() }))

import { loadRingForPage, residentsByDid } from '@/lib/rings/page-data'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { RingHubAuthError } from '@/lib/api/ringhub/ringhub-errors'
import { cached, clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { db } from '@/lib/config/database/connection'

const descriptor = (slug: string, visibility = 'PUBLIC') => ({
  id: `id-${slug}`, slug, name: `Ring ${slug}`, description: 'About it', visibility, joinPolicy: 'OPEN', postPolicy: 'MEMBERS',
  ownerDid: 'did:web:sam', parentId: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  curatorNote: null, bannerUrl: null, themeColor: null, badgeImageUrl: null, badgeImageHighResUrl: null,
  metadata: null, policies: null, memberCount: 3, postCount: 4, children: [{ id: 'c', slug: 'kid', name: 'Kid', memberCount: 1 }],
})

const never = () => new Promise<never>(() => {})
let publicGetRing: jest.Mock
let getRingAsMember: jest.Mock

beforeEach(() => {
  clearCache()
  jest.clearAllMocks()
  publicGetRing = jest.fn(async (slug: string) => descriptor(slug))
  getRingAsMember = jest.fn(async (slug: string) => descriptor(slug, 'PRIVATE'))
  ;(getPublicRingHubClient as jest.Mock).mockReturnValue({ getRing: publicGetRing, getStats: jest.fn(async () => ({ totalRings: 10 })) })
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue({ getRingAsMember })
})

afterEach(() => {
  expect((db as any).threadRing.findUnique).not.toHaveBeenCalled()
})

test("signed in, it's read as the viewer, so a private ring's member sees it", async () => {
  const load = await loadRingForPage('secret', 'u1')
  expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('u1')
  expect(load).toMatchObject({ status: 'ok', ring: { slug: 'secret', visibility: 'private', directChildrenCount: 1, host: { username: 'sam', displayName: 'Sam' } } })
  expect(publicGetRing).not.toHaveBeenCalled()
})

test("a key problem falls back to the unsigned read, so it never hides a public ring", async () => {
  getRingAsMember.mockRejectedValue(new RingHubAuthError('stale key'))
  const load = await loadRingForPage('open-ring', 'u1')
  expect(load).toMatchObject({ status: 'ok', ring: { slug: 'open-ring', visibility: 'public' } })
})

test('a hub 404 is a 404', async () => {
  publicGetRing.mockResolvedValue(null)
  expect(await loadRingForPage('gone', null)).toEqual({ status: 'not-found' })
})

test('unsigned, a private ring kept in the shared cache is still a 404', async () => {
  await cached('ring:secret', 60_000, 60_000, async () => descriptor('secret', 'PRIVATE'))
  expect(await loadRingForPage('secret', null)).toEqual({ status: 'not-found' })
})

test('a slow hub serves the copy the cache kept', async () => {
  await cached('ring:knits', 60_000, 60_000, async () => descriptor('knits'))
  getRingAsMember.mockImplementation(never)
  const load = await loadRingForPage('knits', 'u1', 20)
  expect(load).toMatchObject({ status: 'ok', ring: { slug: 'knits', memberCount: 3 } })
})

test("a slow hub with nothing kept says so, and a kept private ring doesn't count", async () => {
  getRingAsMember.mockImplementation(never)
  expect(await loadRingForPage('knits', 'u1', 20)).toEqual({ status: 'slow' })

  await cached('ring:secret', 60_000, 60_000, async () => descriptor('secret', 'PRIVATE'))
  expect(await loadRingForPage('secret', 'u1', 20)).toEqual({ status: 'slow' })
})

test("the Spool counts every ring but itself", async () => {
  const load = await loadRingForPage('spool', null)
  expect(load).toMatchObject({ status: 'ok', ring: { isSystemRing: true, totalRings: 9 } })
})

test('residents are named by DID; one the database leaves out (hidden, or not here) is not', async () => {
  ;(db as any).user.findMany.mockResolvedValueOnce([{ id: 'user-of-did:web:sam', primaryHandle: 'sam@HomePageAgain', profile: { displayName: null } }])
  const names = await residentsByDid(['did:web:sam', 'did:web:hidden'], 'u1')
  expect([...names]).toEqual([['did:web:sam', { username: 'sam', displayName: null }]])
})
