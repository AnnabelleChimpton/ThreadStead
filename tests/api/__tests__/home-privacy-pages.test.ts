/**
 * The pixel-home pages ask lib/domain/users/profile-access before showing
 * anything: the home page shows the private-profile page, the decorate page
 * redirects non-owners before loading the home, and the street and the
 * mutual-friends street filter their lists. The rules themselves run
 * against real Postgres in tests/db/home-privacy.dbtest.ts; here they're
 * stubbed so each page's wiring can be checked on its own.
 */
type Row = { userId: string; visibleTo: Array<string | null> }

const homes: Row[] = []
const findManyCalls: any[] = []

const config = (userId: string) => ({
  userId,
  houseTemplate: 'cabin_v1',
  palette: 'pixel_petals',
  bookSkin: 'linen_v1',
  seasonalOptIn: false,
  preferPixelHome: false,
  atmosphereSky: 'sunny',
  atmosphereWeather: 'clear',
  atmosphereTimeOfDay: 'midday',
  houseTitle: `${userId} house`,
  terrain: {},
  decorations: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: userId, handles: [{ handle: userId, host: 'test' }], profile: null, sessions: [] },
})

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async ({ where }: any) => ({
        handle: where.handle,
        user: {
          id: `u_${where.handle}`,
          profile: { displayName: where.handle, bio: 'secret bio', avatarUrl: null, visibility: 'friends' },
        },
      })),
    },
    userHomeConfig: {
      findUnique: jest.fn(async ({ where }: any) => config(where.userId)),
      create: jest.fn(async ({ data }: any) => config(data.userId)),
      // Filters on the stubbed visibleResidentWhere marker below
      findMany: jest.fn(async (args: any) => {
        findManyCalls.push(args)
        const marker = args.where?.user?.visibleTo
        return homes
          .filter((h) => (args.where?.userId?.in ? args.where.userId.in.includes(h.userId) : true))
          .filter((h) => marker !== undefined && h.visibleTo.includes(marker))
          .map((h) => config(h.userId))
      }),
    },
    decorationItem: { findMany: jest.fn(async () => []) },
    follow: { findMany: jest.fn(async () => [{ followee: { id: 'u_pal' } }]) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
// Next-door houses have their own real-Postgres tests (tests/db/home-neighbors.dbtest.ts)
jest.mock('@/lib/pixel-homes/neighbors', () => ({
  getHomeNeighbors: jest.fn(async () => ({ previous: { username: 'ada', displayName: null }, next: null })),
}))
jest.mock('@/lib/domain/users/profile-access', () => ({
  residentAccess: jest.fn(),
  visibleResidentWhere: (viewerId: string | null | undefined) => ({ visibleTo: viewerId ?? null }),
}))

import { getServerSideProps as homePageProps } from '@/pages/home/[handle]'
import { getServerSideProps as decoratePageProps } from '@/pages/home/[handle]/decorate'
import { getServerSideProps as streetProps } from '@/pages/neighborhood/[type]/[param]'
import { getServerSideProps as mutualFriendsProps } from '@/pages/neighborhood/mutual-friends/[username]'
import { getSessionUser } from '@/lib/auth/server'
import { residentAccess } from '@/lib/domain/users/profile-access'
import { db } from '@/lib/config/database/connection'

const ctx = (query: Record<string, string>, viewer: string | null, params?: Record<string, string>) => {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  return { query, params: params ?? query, req: { headers: {} }, res: { setHeader() {} } } as any
}
const hidden = (visibility: string) => ({ visible: false, visibility, blocked: false })

beforeEach(() => {
  jest.clearAllMocks()
  findManyCalls.length = 0
  homes.length = 0
})

describe('/home/[handle]', () => {
  test('a home the viewer can’t see shows the private-profile page and loads nothing', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue(hidden('friends'))
    const result: any = await homePageProps(ctx({ handle: 'shy' }, 'u_stranger'))

    expect(residentAccess).toHaveBeenCalledWith({ id: 'u_stranger', role: 'member' }, 'u_shy', 'friends')
    expect(result).toEqual({
      props: {
        privateProfile: { username: 'shy', displayName: 'shy', avatarUrl: '/assets/default-avatar.gif', visibility: 'friends' },
      },
    })
    // No house, sign, bio or OG text in the props, and no home created
    expect(JSON.stringify(result)).not.toContain('secret bio')
    expect(db.userHomeConfig.findUnique).not.toHaveBeenCalled()
    expect(db.userHomeConfig.create).not.toHaveBeenCalled()
  })

  test('a home the viewer can see renders as before', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue({ visible: true })
    const result: any = await homePageProps(ctx({ handle: 'shy' }, 'u_friend'))
    expect(result.props.homeConfig.houseCustomizations.houseTitle).toBe('u_shy house')
    expect(result.props.privateProfile).toBeUndefined()
    expect(result.props.isSignedIn).toBe(true)
    expect(result.props.neighbors).toEqual({ previous: { username: 'ada', displayName: null }, next: null })
  })

  test('a signed-out visitor is flagged so the page doesn’t record a visit', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue({ visible: true })
    const result: any = await homePageProps(ctx({ handle: 'shy' }, null))
    expect(result.props.isSignedIn).toBe(false)
    expect(result.props.isOwner).toBe(false)
  })
})

describe('/home/[handle]/decorate', () => {
  test('sends everyone but the owner to the home page before loading the home', async () => {
    const result: any = await decoratePageProps(ctx({}, 'u_stranger', { handle: 'shy' }))
    expect(result).toEqual({ redirect: { destination: '/home/shy', permanent: false } })
    expect(db.userHomeConfig.findUnique).not.toHaveBeenCalled()
  })

  test('the owner gets the editor', async () => {
    const result: any = await decoratePageProps(ctx({}, 'u_shy', { handle: 'shy' }))
    expect(result.props.isOwnHome).toBe(true)
  })
})

describe('the street', () => {
  test('lists only homes the viewer may see', async () => {
    homes.push({ userId: 'u_open', visibleTo: [null, 'u_me'] }, { userId: 'u_shy', visibleTo: ['u_me'] })

    const asGuest: any = await streetProps(ctx({ type: 'explore', param: 'all' }, null))
    expect(asGuest.props.members.map((m: any) => m.userId)).toEqual(['u_open'])

    const asMe: any = await streetProps(ctx({ type: 'explore', param: 'all' }, 'u_me'))
    expect(asMe.props.members.map((m: any) => m.userId)).toEqual(['u_open', 'u_shy'])
  })

  test('the mutual placeholder street filters the same way', async () => {
    homes.push({ userId: 'u_open', visibleTo: [null] }, { userId: 'u_shy', visibleTo: [] })
    const result: any = await streetProps(ctx({ type: 'mutual', param: 'someone' }, null))
    expect(result.props.members.map((m: any) => m.userId)).toEqual(['u_open'])
  })
})

describe('/neighborhood/mutual-friends/[username]', () => {
  test('someone whose profile the viewer can’t see goes to their (private) home page', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue(hidden('private'))
    const result: any = await mutualFriendsProps(ctx({ username: 'shy' }, 'u_me'))
    expect(result).toEqual({ redirect: { destination: '/home/shy', permanent: false } })
    expect(db.follow.findMany).not.toHaveBeenCalled()
  })

  test('lists only the mutual friends whose homes the viewer may see', async () => {
    ;(residentAccess as jest.Mock).mockResolvedValue({ visible: true })
    homes.push({ userId: 'u_pal', visibleTo: [] })
    const result: any = await mutualFriendsProps(ctx({ username: 'open' }, 'u_me'))
    expect(findManyCalls[0].where.user).toEqual({ visibleTo: 'u_me' })
    expect(result.props.mutualFriends).toEqual([])
  })
})
