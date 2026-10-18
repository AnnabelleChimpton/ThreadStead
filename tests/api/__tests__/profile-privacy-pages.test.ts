/**
 * Pages and widgets that show profile-level things ask
 * lib/domain/users/profile-access first: the ring-badges page shows the
 * private-profile page before asking RingHub, the view-source page before
 * reading the template, the media page forwards the viewer's cookie and shows
 * the private-profile page on a 403, and the homepage neighborhood
 * widget skips a home that answers 403 instead of drawing a made-up cottage.
 * The rules themselves run against real Postgres in
 * tests/db/profile-privacy.dbtest.ts.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async ({ where }: any) => ({
        handle: where.handle,
        user: {
          id: `u_${where.handle}`,
          profile: { displayName: where.handle, avatarUrl: null, visibility: 'followers', badgePreferences: null },
        },
      })),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/domain/users/profile-access', () => ({ residentAccess: jest.fn() }))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/api/did/server-did-client', () => ({ getUserDID: jest.fn(async () => 'did:test:shy') }))
const getActorBadges = jest.fn(async () => ({
  badges: [
    {
      ring: { slug: 'quiet-ring', name: 'Quiet Ring', visibility: 'PUBLIC' },
      badge: { credentialSubject: { achievement: { name: 'Quiet Ring' } } },
      membership: { role: 'member', joinedAt: '2026-01-01T00:00:00Z' },
    },
  ],
}))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  getPublicRingHubClient: () => ({ getActorBadges, getRing: jest.fn(async () => null) }),
}))

import { getServerSideProps as badgesPageProps } from '@/pages/resident/[username]/badges'
import { getServerSideProps as sourcePageProps } from '@/pages/resident/[username]/source'
import { getServerSideProps as mediaPageProps } from '@/pages/resident/[username]/media'
import { pixelHomesNeighborhoodWidget } from '@/components/widgets/examples/PixelHomesNeighborhoodWidget'
import { getSessionUser } from '@/lib/auth/server'
import { residentAccess } from '@/lib/domain/users/profile-access'

const ctx = (username: string, viewer: string | null) => {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  return { params: { username }, query: {}, req: { headers: {} }, res: { setHeader() {} } } as any
}

beforeEach(() => jest.clearAllMocks())

describe('/resident/[username]/badges', () => {
  test('a profile the viewer can’t see shows the private-profile page and never asks the hub', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue({ visible: false, visibility: 'followers', blocked: false })
    const result: any = await badgesPageProps(ctx('shy', 'u_stranger'))

    expect(residentAccess).toHaveBeenCalledWith({ id: 'u_stranger', role: 'member' }, 'u_shy', 'followers')
    expect(result).toEqual({
      props: {
        privateProfile: { username: 'shy', displayName: 'shy', avatarUrl: '/assets/default-avatar.gif', visibility: 'followers' },
      },
    })
    expect(getActorBadges).not.toHaveBeenCalled()
  })

  test('a profile the viewer can see lists its badges as before', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue({ visible: true })
    const result: any = await badgesPageProps(ctx('shy', 'u_follower'))
    expect(result.props.badges.map((b: any) => b.threadRing.slug)).toEqual(['quiet-ring'])
    expect(result.props.privateProfile).toBeUndefined()
  })
})

describe('/resident/[username]/source', () => {
  test('a profile the viewer can’t see shows the private-profile page, not the template', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue({ visible: false, visibility: 'followers', blocked: false })
    const result: any = await sourcePageProps(ctx('shy', 'u_stranger'))

    expect(residentAccess).toHaveBeenCalledWith({ id: 'u_stranger', role: 'member' }, 'u_shy', 'followers')
    expect(result).toEqual({
      props: {
        privateProfile: { username: 'shy', displayName: 'shy', avatarUrl: '/assets/default-avatar.gif', visibility: 'followers' },
      },
    })
  })

  test('a profile the viewer can see shows its source page as before', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue({ visible: true })
    const result: any = await sourcePageProps(ctx('shy', 'u_follower'))
    expect(result.props.privateProfile).toBeUndefined()
    expect(result.props).toEqual(expect.objectContaining({ username: 'shy', isOwner: false }))
  })
})

describe('/resident/[username]/media', () => {
  const json = (status: number, body: any) => ({ ok: status < 400, status, json: async () => body }) as Response
  const withCookie = (username: string, viewer: string | null) => {
    const c = ctx(username, viewer)
    c.req.headers.cookie = 'retro_session=abc'
    return c
  }

  test('forwards the cookie, so the owner of a non-public profile gets their gallery', async () => {
    const fetchMock = jest.fn(async (url: string) =>
      url.includes('/api/photos/')
        ? json(200, { media: [{ id: 'm1' }], pagination: { page: 1, limit: 20, totalCount: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false } })
        : json(200, { userId: 'u_shy' })
    )
    global.fetch = fetchMock as any
    const result: any = await mediaPageProps(withCookie('shy', 'u_shy'))

    for (const [, init] of fetchMock.mock.calls as any[]) {
      expect(init.headers.cookie).toBe('retro_session=abc')
    }
    expect(result.props).toEqual(expect.objectContaining({ username: 'shy', isOwner: true, initialMedia: [{ id: 'm1' }] }))
  })

  test('a 403 from the profile API shows the private-profile page and skips the photos', async () => {
    const fetchMock = jest.fn(async () =>
      json(403, { error: 'private_profile', visibility: 'friends', username: 'shy', displayName: 'Shy', avatarUrl: null })
    )
    global.fetch = fetchMock as any
    const result: any = await mediaPageProps(withCookie('shy', 'u_stranger'))

    expect(result).toEqual({
      props: {
        privateProfile: { username: 'shy', displayName: 'Shy', avatarUrl: '/assets/default-avatar.gif', visibility: 'friends' },
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('homepage neighborhood widget', () => {
  const json = (status: number, body: any) => ({ ok: status < 400, status, json: async () => body }) as Response
  const directory = (usernames: string[]) =>
    json(200, { users: usernames.map((u) => ({ id: `u_${u}`, username: u, displayName: u, avatarUrl: null, followerCount: 0 })) })

  function serve(directoryUsers: string[], hidden: string[]) {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.startsWith('/api/directory')) return directory(directoryUsers)
      const username = url.startsWith('/api/home/decorations')
        ? new URL(url, 'http://x').searchParams.get('username')!
        : url.slice('/api/home/'.length)
      if (hidden.includes(username)) return json(403, { error: 'private_profile', visibility: 'private' })
      return url.startsWith('/api/home/decorations')
        ? json(200, { decorations: [] })
        : json(200, { homeConfig: { houseTemplate: 'cabin_v1', palette: 'pixel_petals' } })
    })
    global.fetch = fetchMock as any
    return fetchMock
  }

  test('skips a home that answers 403 and shows someone it may see', async () => {
    serve(['shy', 'open'], ['shy'])
    for (let i = 0; i < 10; i++) {
      const data: any = await pixelHomesNeighborhoodWidget.fetchData()
      expect(data.home.username).toBe('open')
      expect(data.home.homeConfig.houseTemplate).toBe('cabin_v1')
    }
  })

  test('never draws a default cottage for a hidden home', async () => {
    serve(['shy'], ['shy'])
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(pixelHomesNeighborhoodWidget.fetchData()).rejects.toThrow('No homes to show')
  })
})
