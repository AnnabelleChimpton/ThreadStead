/**
 * The ring's Manage page and the pages it replaced:
 *  - each tab is for whoever Ring Hub lets do it (the Host all five,
 *    moderators People and Prompts, a site admin what the hub lets the site
 *    do), and anyone else gets a 404;
 *  - ?tab= opens a tab this person has, else their first;
 *  - a slow hub says so rather than showing anything from the local mirror;
 *  - settings, members, sites and badge-manager send people on.
 */
import type { GetServerSidePropsContext } from 'next'

jest.mock('@/lib/config/database/connection', () => ({ db: {} }))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/domain/threadrings/ring-access', () => ({ readRingAs: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: jest.fn(() => ({})) }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({ createAuthenticatedRingHubClient: jest.fn(() => ({})) }))
jest.mock('@/lib/rings/manage', () => ({
  ...jest.requireActual('@/lib/rings/manage'),
  ringPeople: jest.fn(async () => []),
  ringStopsData: jest.fn(async () => ({ rule: 'allow', ruleIsDefault: true, isPublic: true, rows: [], busiest: [] })),
}))

import { getServerSideProps as manage } from '@/pages/tr/[slug]/manage'
import { getServerSideProps as members } from '@/pages/tr/[slug]/members'
import { getServerSideProps as settings } from '@/pages/tr/[slug]/settings'
import { getServerSideProps as sites } from '@/pages/tr/[slug]/sites'
import { getServerSideProps as badgeManager } from '@/pages/tr/[slug]/badge-manager'
import { getSessionUser } from '@/lib/auth/server'
import { readRingAs } from '@/lib/domain/threadrings/ring-access'
import { ringPeople, ringStopsData } from '@/lib/rings/manage'

const ring = { slug: 'knits', name: 'Cozy Knits', ownerDid: 'did:host', visibility: 'PUBLIC', joinPolicy: 'OPEN', postPolicy: 'MEMBERS', memberCount: 4 }
const access = (over: Record<string, unknown> = {}) => ({ ring, viewerDid: 'did:me', isHost: false, isSteward: false, manageAs: null, ...over })
const HOST = access({ isHost: true, isSteward: true, manageAs: 'self' })
const MOD = access({ isSteward: true })
const ADMIN = access({ manageAs: 'site' })

function ctx(query: Record<string, string> = {}): GetServerSidePropsContext {
  return { params: { slug: 'knits' }, query: { slug: 'knits', ...query }, req: {}, res: { statusCode: 200 } } as unknown as GetServerSidePropsContext
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the props union, read loosely
const props = async (query?: Record<string, string>): Promise<any> => ((await manage(ctx(query))) as { props: unknown }).props

beforeEach(() => {
  jest.clearAllMocks()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'member', primaryHandle: 'cat@HomePageAgain' })
})

describe('Manage', () => {
  test('signed out, it asks you to sign in and comes back', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    expect(await manage(ctx())).toEqual({
      redirect: { destination: '/login?next=%2Ftr%2Fknits%2Fmanage', permanent: false },
    })
  })

  test('the Host gets every tab, and the one asked for', async () => {
    ;(readRingAs as jest.Mock).mockResolvedValue(HOST)
    const p = await props({ tab: 'stops' })
    expect(p.rights).toEqual({ tabs: ['ring', 'people', 'badge', 'stops', 'prompts'], roles: true, remove: 'any', invite: true, handOver: true, delete: true })
    expect(p.tab).toBe('stops')
    expect(p.viewer).toEqual({ id: 'u1', username: 'cat' })
    expect(ringStopsData).toHaveBeenCalled()
  })

  test("a moderator gets People and Prompts; a tab they don't have opens their first", async () => {
    ;(readRingAs as jest.Mock).mockResolvedValue(MOD)
    const p = await props({ tab: 'ring' })
    expect(p.rights).toMatchObject({ tabs: ['people', 'prompts'], roles: false, remove: 'members', invite: true, handOver: false, delete: false })
    expect(p.tab).toBe('people')
    expect(ringStopsData).not.toHaveBeenCalled()
  })

  test('a site admin gets what the hub lets the site do: settings, roles, badge, hand-over', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'admin', role: 'admin', primaryHandle: null })
    ;(readRingAs as jest.Mock).mockResolvedValue(ADMIN)
    expect((await props()).rights).toEqual({ tabs: ['ring', 'people', 'badge'], roles: true, remove: null, invite: false, handOver: true, delete: false })
  })

  test('a plain member, or a ring the viewer can’t see, is a 404', async () => {
    ;(readRingAs as jest.Mock).mockResolvedValue(access())
    expect(await manage(ctx())).toEqual({ notFound: true })
    ;(readRingAs as jest.Mock).mockResolvedValue(null)
    expect(await manage(ctx())).toEqual({ notFound: true })
  })

  test("a hub that doesn't answer is said so; a slow members read leaves People to say so", async () => {
    ;(readRingAs as jest.Mock).mockRejectedValue(new Error('down'))
    const c = ctx()
    expect(await manage(c)).toEqual({ props: { kind: 'unavailable', slug: 'knits' } })
    expect(c.res.statusCode).toBe(503)

    const { HUB_TIMEOUT } = jest.requireActual('@/lib/api/ringhub/ringhub-ssr')
    ;(readRingAs as jest.Mock).mockResolvedValue(HOST)
    ;(ringPeople as jest.Mock).mockResolvedValueOnce(HUB_TIMEOUT)
    expect((await props()).people).toBeNull()
  })

  test('settings come from the hub as the viewer read them', async () => {
    ;(readRingAs as jest.Mock).mockResolvedValue(access({ ...HOST, ring: { ...ring, description: 'Socks', themeColor: '#8c4a5b' } }))
    expect((await props()).settings).toMatchObject({ name: 'Cozy Knits', description: 'Socks', themeColor: '#8c4a5b', joinType: 'open', postPolicy: 'members' })
  })
})

describe('the pages Manage replaced', () => {
  test('settings, badge-manager and sites send people on', async () => {
    expect(await settings(ctx())).toEqual({ redirect: { destination: '/tr/knits/manage?tab=ring', permanent: false } })
    expect(await badgeManager(ctx())).toEqual({ redirect: { destination: '/tr/knits/manage?tab=badge', permanent: false } })
    expect(await sites(ctx())).toEqual({ redirect: { destination: '/neighborhood/ring/knits#people', permanent: false } })
  })

  test('members: Manage › People for those who look after people, the ring street for everyone else', async () => {
    ;(readRingAs as jest.Mock).mockResolvedValue(MOD)
    expect(await members(ctx())).toEqual({ redirect: { destination: '/tr/knits/manage?tab=people', permanent: false } })
    ;(readRingAs as jest.Mock).mockResolvedValue(access())
    expect(await members(ctx())).toEqual({ redirect: { destination: '/neighborhood/ring/knits#people', permanent: false } })
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    expect(await members(ctx())).toEqual({ redirect: { destination: '/neighborhood/ring/knits#people', permanent: false } })
    // A ring that isn't public has no street
    ;(readRingAs as jest.Mock).mockResolvedValue(access({ ring: { ...ring, visibility: 'PRIVATE' } }))
    expect(await members(ctx())).toEqual({ redirect: { destination: '/tr/knits', permanent: false } })
    ;(readRingAs as jest.Mock).mockResolvedValue(null)
    expect(await members(ctx())).toEqual({ notFound: true })
  })
})
