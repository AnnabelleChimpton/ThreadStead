/**
 * /home/<handle>'s og:image is the yard's share snapshot, and only for a
 * home a signed-out visitor could see: link previews reach everyone, so
 * who's viewing the page doesn't matter. The snapshot itself (drawing,
 * storage, the lazy route) runs against real Postgres in
 * tests/db/home-snapshot.dbtest.ts.
 */
let profile: { displayName: string; bio: string | null; avatarUrl: null; visibility: string } | null
let snapshotUrl: string | null

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async ({ where }: any) => ({
        handle: where.handle,
        user: { id: `u_${where.handle}`, profile },
      })),
    },
    userHomeConfig: {
      findUnique: jest.fn(async ({ where }: any) => ({
        userId: where.userId,
        houseTemplate: 'cabin_v1',
        palette: 'pixel_petals',
        atmosphereSky: 'sunny',
        terrain: {},
        snapshotUrl,
      })),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/pixel-homes/neighbors', () => ({ getHomeNeighbors: jest.fn(async () => ({ previous: null, next: null })) }))
jest.mock('@/lib/domain/users/profile-access', () => ({ residentAccess: jest.fn(async () => ({ visible: true })) }))
jest.mock('@/lib/pixel-homes/snapshot/service', () => ({ scheduleHomeSnapshot: jest.fn(async () => null) }))

import { getServerSideProps } from '@/pages/home/[handle]'
import { getSessionUser } from '@/lib/auth/server'
import { residentAccess } from '@/lib/domain/users/profile-access'
import { scheduleHomeSnapshot } from '@/lib/pixel-homes/snapshot/service'

async function props(handle: string, viewer: string | null = null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  const result: any = await getServerSideProps({ query: { handle }, req: { headers: {} }, res: {} } as any)
  return result.props
}

beforeEach(() => {
  jest.clearAllMocks()
  profile = { displayName: 'Ada', bio: null, avatarUrl: null, visibility: 'public' }
  snapshotUrl = null
})

test('a public home with a snapshot uses it, and draws nothing', async () => {
  snapshotUrl = 'https://cdn.test/pixel-homes/snapshots/u_ada.abc.png'
  expect((await props('ada')).shareImage).toBe(snapshotUrl)
  expect(scheduleHomeSnapshot).not.toHaveBeenCalled()
})

test('a public home without one starts drawing it and points at the route that waits for it', async () => {
  expect((await props('ada')).shareImage).toMatch(/^https?:\/\/[^/]+\/api\/home\/ada\/snapshot$/)
  expect(scheduleHomeSnapshot).toHaveBeenCalledWith('u_ada')
})

test('no profile row counts as public', async () => {
  profile = null
  snapshotUrl = 'https://cdn.test/s.png'
  expect((await props('ada')).shareImage).toBe(snapshotUrl)
})

test.each(['followers', 'friends', 'private'])(
  'a %s home has no share image, even for a viewer who may see it',
  async (visibility) => {
    profile = { displayName: 'Ada', bio: null, avatarUrl: null, visibility }
    snapshotUrl = 'https://cdn.test/stale.png'
    const p = await props('ada', 'u_ada')
    expect(p.homeConfig).toBeTruthy() // the owner still sees their home
    expect(p.shareImage).toBeNull()
    expect(scheduleHomeSnapshot).not.toHaveBeenCalled()
  }
)

test('a hidden home shows the private page, with no share image', async () => {
  profile = { displayName: 'Ada', bio: null, avatarUrl: null, visibility: 'private' }
  ;(residentAccess as jest.Mock).mockResolvedValueOnce({ visible: false, visibility: 'private', blocked: false })
  const p = await props('ada')
  expect(p.privateProfile).toBeTruthy()
  expect(p.shareImage).toBeUndefined()
  expect(JSON.stringify(p)).not.toContain('snapshot')
})
