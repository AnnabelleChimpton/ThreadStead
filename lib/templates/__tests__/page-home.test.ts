/**
 * @jest-environment node
 *
 * residentData.pixelHome for <MyHouse /> <HouseBadge /> <RingNav />: read
 * from the local database only, and only when the page uses one of them.
 */
jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

import { pageHomeFor, pageHomeIfUsed, pageUsesAny, PAGE_HOME_COMPONENTS } from '../page-home'

type Db = Parameters<typeof pageHomeFor>[0]

function fakeDb(config: Record<string, unknown> | null, number: number | null = 12) {
  const db = {
    userHomeConfig: { findUnique: jest.fn().mockResolvedValue(config) },
    user: {},
    $queryRaw: jest.fn().mockResolvedValue(number === null ? [] : [{ id: 'u1', number: BigInt(number) }]),
  }
  return Object.assign(db, { asDb: db as unknown as Db })
}

const CONFIG = {
  userId: 'u1',
  houseTemplate: 'cabin_v1',
  palette: 'crt_glow',
  wallColor: '#112233',
  roofColor: null,
  windowStyle: 'round',
  snapshotCardUrl: 'https://cdn.example/home-snapshots/u1.h.card.png',
}

describe('pageUsesAny', () => {
  test('finds the components among the islands, whatever the case', () => {
    expect(pageUsesAny({ islands: [{ component: 'Guestbook' }, { component: 'myhouse' }] }, PAGE_HOME_COMPONENTS)).toBe(true)
    expect(pageUsesAny({ islands: [{ component: 'RingNav' }] }, PAGE_HOME_COMPONENTS)).toBe(true)
    expect(pageUsesAny({ islands: [{ component: 'Guestbook' }, { component: 'MyRings' }] }, PAGE_HOME_COMPONENTS)).toBe(false)
    expect(pageUsesAny(null, PAGE_HOME_COMPONENTS)).toBe(false)
    expect(pageUsesAny({ islands: 'nope' }, PAGE_HOME_COMPONENTS)).toBe(false)
  })
})

describe('pageHomeIfUsed', () => {
  test('a page without them reads nothing', async () => {
    const db = fakeDb(CONFIG)
    expect(await pageHomeIfUsed({ islands: [{ component: 'Guestbook' }] }, 'u1', true, db.asDb)).toBeUndefined()
    expect(db.userHomeConfig.findUnique).not.toHaveBeenCalled()
  })

  test('no home: null, without a query', async () => {
    const db = fakeDb(CONFIG)
    expect(await pageHomeIfUsed({ islands: [{ component: 'MyHouse' }] }, 'u1', false, db.asDb)).toBeNull()
    expect(db.userHomeConfig.findUnique).not.toHaveBeenCalled()
  })

  test('the home: house, colours, number and yard picture', async () => {
    const db = fakeDb(CONFIG)
    expect(await pageHomeIfUsed({ islands: [{ component: 'HouseBadge' }] }, 'u1', true, db.asDb)).toEqual({
      template: 'cabin_v1',
      palette: 'crt_glow',
      customizations: { wallColor: '#112233', windowStyle: 'round' },
      number: 12,
      snapshotCardUrl: 'https://cdn.example/home-snapshots/u1.h.card.png',
    })
    expect(db.userHomeConfig.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })
})

describe('pageHomeFor', () => {
  test('null without a row; no number or picture when there is none', async () => {
    expect(await pageHomeFor(fakeDb(null).asDb, 'u1')).toBeNull()
    const home = await pageHomeFor(fakeDb({ ...CONFIG, snapshotCardUrl: null }, null).asDb, 'u1')
    expect(home?.number).toBeNull()
    expect(home?.snapshotCardUrl).toBeNull()
  })
})
