/**
 * Next-door links on /home: neighbors are fixed by join order, and only
 * houses the viewer could visit count (pixel home, local handle, profile
 * visible, no block either way).
 */
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { getHomeNeighbors } from '@/lib/pixel-homes/neighbors'

let seq = 0
async function resident(
  handle: string,
  joined: string,
  { home = true, visibility = 'public' as Visibility, host = SITE_NAME } = {}
) {
  return db.user.create({
    data: {
      id: `u_${handle}`,
      did: `did:test:${handle}:${seq++}`,
      createdAt: new Date(joined),
      handles: { create: { handle, host } },
      profile: { create: { displayName: handle.toUpperCase(), visibility } },
      ...(home ? { homeConfig: { create: {} } } : {}),
    },
  })
}

const near = (n: { previous: { username: string } | null; next: { username: string } | null }) => [
  n.previous?.username ?? null,
  n.next?.username ?? null,
]

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.$disconnect()
})

describe('getHomeNeighbors', () => {
  it('returns the houses either side by join order', async () => {
    await resident('ada', '2026-01-01')
    const bo = await resident('bo', '2026-02-01')
    await resident('cy', '2026-03-01')
    expect(near(await getHomeNeighbors(db, bo, { viewerId: null, host: SITE_NAME }))).toEqual(['ada', 'cy'])
  })

  it('has no neighbor past either end of the street', async () => {
    const ada = await resident('ada', '2026-01-01')
    const bo = await resident('bo', '2026-02-01')
    expect(near(await getHomeNeighbors(db, ada, { viewerId: null, host: SITE_NAME }))).toEqual([null, 'bo'])
    expect(near(await getHomeNeighbors(db, bo, { viewerId: null, host: SITE_NAME }))).toEqual(['ada', null])
  })

  it('skips people without a pixel home, remote handles, and profiles the viewer cannot see', async () => {
    await resident('ada', '2026-01-01')
    await resident('nohome', '2026-01-15', { home: false })
    await resident('remote', '2026-01-20', { host: 'elsewhere.example' })
    await resident('shy', '2026-01-25', { visibility: 'private' })
    const bo = await resident('bo', '2026-02-01')
    expect(near(await getHomeNeighbors(db, bo, { viewerId: null, host: SITE_NAME }))[0]).toBe('ada')
  })

  it('skips anyone the viewer blocked, or who blocked the viewer', async () => {
    const viewer = await resident('viewer', '2025-12-01')
    const ada = await resident('ada', '2026-01-01')
    const bo = await resident('bo', '2026-02-01')
    const cy = await resident('cy', '2026-03-01')
    await db.userBlock.create({ data: { blockerId: viewer.id, blockedUserId: ada.id } })
    await db.userBlock.create({ data: { blockerId: cy.id, blockedUserId: viewer.id } })
    expect(near(await getHomeNeighbors(db, bo, { viewerId: viewer.id, host: SITE_NAME }))).toEqual(['viewer', null])
  })

  it('uses the display name when there is one', async () => {
    await resident('ada', '2026-01-01')
    const bo = await resident('bo', '2026-02-01')
    const n = await getHomeNeighbors(db, bo, { viewerId: null, host: SITE_NAME })
    expect(n.previous).toEqual({ username: 'ada', displayName: 'ADA' })
  })
})
