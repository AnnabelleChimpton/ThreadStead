/**
 * The street (lib/pixel-homes/street.ts): house numbers from join order,
 * streets of HOUSES_PER_STREET, hidden homes leave gaps instead of shifting
 * anyone, and "Recently decorated" never touches the street order.
 */
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import {
  HOUSES_PER_STREET,
  getRecentlyDecorated,
  getStreetPage,
  streetIndexOf,
  streetName,
  streetOfNumber,
} from '@/lib/pixel-homes/street'

let seq = 0
async function resident(
  handle: string,
  joined: Date,
  { home = true, visibility = 'public' as Visibility, host = SITE_NAME, snapshot = null as string | null } = {}
) {
  return db.user.create({
    data: {
      id: `u_${handle}`,
      did: `did:test:${handle}:${seq++}`,
      createdAt: joined,
      handles: { create: { handle, host } },
      profile: { create: { displayName: handle.toUpperCase(), visibility } },
      ...(home ? { homeConfig: { create: { snapshotCardUrl: snapshot } } } : {}),
    },
  })
}
const day = (n: number) => new Date(Date.UTC(2025, 7, 1) + n * 86_400_000)

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
})
afterAll(async () => {
  await db.$disconnect()
})

describe('street names and numbers', () => {
  it('names streets from a fixed list, then numbers the repeats', () => {
    expect(streetName(0)).toBe('Pine Street')
    expect(streetName(1)).toBe('Oak Avenue')
    expect(streetName(15)).toBe('Pine Street 2')
    expect(streetOfNumber(1)).toBe(0)
    expect(streetOfNumber(HOUSES_PER_STREET)).toBe(0)
    expect(streetOfNumber(HOUSES_PER_STREET + 1)).toBe(1)
  })
})

describe('getStreetPage', () => {
  it('numbers homes by join order and keeps them in that order', async () => {
    await resident('cy', day(3))
    await resident('ada', day(1))
    await resident('bo', day(2))
    const page = await getStreetPage(db, { index: 0, viewerId: null, host: SITE_NAME })
    expect(page.homes.map((h) => [h.number, h.username])).toEqual([[1, 'ada'], [2, 'bo'], [3, 'cy']])
    expect(page).toMatchObject({ index: 0, name: 'Pine Street', streetCount: 1, totalHomes: 3, previous: null, next: null })
  })

  it('splits homes into streets and links them', async () => {
    for (let i = 0; i < HOUSES_PER_STREET + 2; i++) await resident(`r${i}`, day(i))
    const second = await getStreetPage(db, { index: 1, viewerId: null, host: SITE_NAME })
    expect(second.homes.map((h) => h.number)).toEqual([HOUSES_PER_STREET + 1, HOUSES_PER_STREET + 2])
    expect(second.previous).toEqual({ index: 0, name: 'Pine Street' })
    expect(second.next).toBeNull()
    // Past the end: the last street
    expect((await getStreetPage(db, { index: 9, viewerId: null, host: SITE_NAME })).index).toBe(1)
  })

  it('leaves a gap for a hidden home instead of renumbering, and skips people without a home or a local handle', async () => {
    await resident('ada', day(1))
    await resident('shy', day(2), { visibility: 'private' })
    await resident('nohome', day(3), { home: false })
    await resident('remote', day(4), { host: 'elsewhere.example' })
    await resident('cy', day(5))
    const page = await getStreetPage(db, { index: 0, viewerId: null, host: SITE_NAME })
    expect(page.homes.map((h) => [h.number, h.username])).toEqual([[1, 'ada'], [3, 'cy']])
    expect(page.totalHomes).toBe(3)
  })

  it('leaves out homes behind a block, either way', async () => {
    const viewer = await resident('viewer', day(0))
    const ada = await resident('ada', day(1))
    await resident('bo', day(2))
    await db.userBlock.create({ data: { blockerId: ada.id, blockedUserId: viewer.id } })
    const page = await getStreetPage(db, { index: 0, viewerId: viewer.id, host: SITE_NAME })
    expect(page.homes.map((h) => h.username)).toEqual(['viewer', 'bo'])
  })

  it('finds which street a resident lives on', async () => {
    for (let i = 0; i < HOUSES_PER_STREET + 1; i++) await resident(`r${i}`, day(i))
    expect(await streetIndexOf(db, 'u_r0', SITE_NAME)).toBe(0)
    expect(await streetIndexOf(db, `u_r${HOUSES_PER_STREET}`, SITE_NAME)).toBe(1)
    expect(await streetIndexOf(db, 'u_nobody', SITE_NAME)).toBeNull()
  })
})

describe('getRecentlyDecorated', () => {
  it('lists decorated homes with a picture, most recently saved first', async () => {
    const ada = await resident('ada', day(1), { snapshot: 'https://cdn.example/ada.png' })
    const bo = await resident('bo', day(2), { snapshot: 'https://cdn.example/bo.png' })
    await resident('bare', day(3), { snapshot: 'https://cdn.example/bare.png' })
    for (const u of [ada, bo]) {
      await db.userHomeDecoration.create({
        data: { userId: u.id, decorationType: 'plant', decorationId: 'roses_red', zone: 'front_yard', positionX: 10, positionY: 200 },
      })
    }
    await db.userHomeConfig.update({ where: { userId: ada.id }, data: { palette: 'crt_glow' } })
    const recent = await getRecentlyDecorated(db, { viewerId: null, host: SITE_NAME })
    expect(recent.map((r) => r.username)).toEqual(['ada', 'bo'])
  })
})
