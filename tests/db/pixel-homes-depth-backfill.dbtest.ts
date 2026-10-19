/**
 * scripts/pixel-homes-depth-backfill.ts against a real Postgres: which
 * placed decorations would now draw behind the house, with --except.
 */
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/scripts/load-env', () => ({}))

import { findDecorationsBehindHouse } from '@/scripts/pixel-homes-depth-backfill'

const userId = 'u_depth'
const row = (decorationId: string, decorationType: string, positionX: number, positionY: number, layerBias = 0) => ({
  userId,
  decorationId,
  decorationType,
  zone: 'front_yard',
  positionX,
  positionY,
  layerBias,
})

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "DecorationItem" RESTART IDENTITY CASCADE')
  await db.user.create({ data: { id: userId, did: 'did:test:depth', handles: { create: { handle: 'depthy', host: SITE_NAME } } } })
  await db.userHomeConfig.create({ data: { userId, houseTemplate: 'cottage_v1', palette: 'thread_sage' } })
  await db.userHomeDecoration.createMany({
    data: [
      row('tree_pine', 'plant', 240, 100), // on the roof: listed
      row('roses_red', 'plant', 220, 150), // against the wall, feet above the line: listed
      row('string_lights', 'lighting', 220, 120), // hung on the house: stays in front anyway
      row('tree_oak', 'plant', 240, 100, 1), // already brought forward
      row('tree_pine', 'plant', 20, 100), // beside the house: no overlap
      row('stone_path', 'path', 240, 150), // flat on the ground
    ],
  })
})

afterAll(() => db.$disconnect())

const ids = (byHome: Map<string, { decorationId: string }[]>) => (byHome.get(userId) ?? []).map((r) => r.decorationId).sort()

test('lists only standing, unbiased decorations that overlap the house and sort behind it', async () => {
  expect(ids(await findDecorationsBehindHouse())).toEqual(['roses_red', 'tree_pine'])
})

test('--except leaves those kinds out, so they go behind the house', async () => {
  expect(ids(await findDecorationsBehindHouse([], ['tree_pine', 'tree_oak', 'small_tree', 'gazebo']))).toEqual(['roses_red'])
})

test('--user narrows it to one home', async () => {
  expect((await findDecorationsBehindHouse(['nobody'])).size).toBe(0)
  expect(ids(await findDecorationsBehindHouse(['depthy']))).toEqual(['roses_red', 'tree_pine'])
})
