/**
 * Contract tests for POST /api/home/decorations/save with a mocked db.
 * The real-Postgres side (catalog availability, rollback) is in
 * tests/db/decorations-save.dbtest.ts.
 *
 * Pins:
 *  - the config upsert and the delete+create of decorations run in ONE
 *    $transaction (the old code ran the upsert outside it, and before that
 *    the replace was two statements that could wipe a yard)
 *  - strict validation with field errors: colours, enums, positions, data size
 *  - only items this resident can use, or already has placed
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const tx = {
  userHomeConfig: { upsert: jest.fn() },
  userHomeDecoration: { deleteMany: jest.fn(), createMany: jest.fn() },
}

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userHomeConfig: { findUnique: jest.fn() },
    userHomeDecoration: { findMany: jest.fn() },
    decorationItem: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/storage/r2', () => ({
  keyFromPublicUrl: (url: string) => (url.startsWith('https://cdn.test/') ? url.slice('https://cdn.test/'.length) : null),
}))

import handler from '@/pages/api/home/decorations/save'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { MAX_DECORATIONS } from '@/lib/pixel-homes/decoration-save-rules'

const mockDb = db as any

function makeReqRes(body: any, method = 'POST') {
  const req = { method, body, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.jsonBody = payload
      return this
    },
    setHeader: jest.fn(),
  }
  return { req, res: res as NextApiResponse & { statusCode: number; jsonBody: any } }
}

async function save(body: any) {
  const { req, res } = makeReqRes(body)
  await handler(req, res)
  return res
}

const ROSES = {
  decorationType: 'plant',
  decorationId: 'roses_red',
  zone: 'front_yard',
  positionX: 10,
  positionY: 20,
}

/** Catalog items available to the user, and items already in their yard. */
function catalog(available: string[], placed: string[] = []) {
  mockDb.decorationItem.findMany.mockResolvedValue(available.map((itemId) => ({ itemId })))
  mockDb.userHomeDecoration.findMany.mockImplementation(async (args: any) =>
    args.where.decorationType === 'custom' ? [] : placed.map((decorationId) => ({ decorationId }))
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'user-1', betaKey: null })
  mockDb.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx))
  mockDb.userHomeConfig.findUnique.mockResolvedValue(null)
  catalog(['roses_red'])
})

describe('auth and shape', () => {
  test('401 when not logged in', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    expect((await save({ decorations: [] })).statusCode).toBe(401)
  })

  test('400 when decorations is not an array', async () => {
    const res = await save({ decorations: 'nope' })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.fields).toHaveProperty('decorations')
  })

  test(`400 past the ${MAX_DECORATIONS}-decoration cap, with the limit in the message`, async () => {
    const res = await save({ decorations: Array.from({ length: MAX_DECORATIONS + 1 }, () => ROSES) })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.error).toContain(String(MAX_DECORATIONS))
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })
})

describe('field validation', () => {
  test.each([
    ['banana', 'Wall color should look like #A1B2C3.'],
    ['000000', 'Wall color should look like #A1B2C3.'],
    ['#abc', 'Wall color should look like #A1B2C3.'],
  ])('rejects wallColor %p', async (wallColor, message) => {
    const res = await save({ decorations: [], houseCustomizations: { wallColor } })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toEqual({ error: message, fields: { 'houseCustomizations.wallColor': message } })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  test('accepts #RRGGBB in either case, and null or empty to clear', async () => {
    const res = await save({
      decorations: [],
      houseCustomizations: { wallColor: '#A1b2C3', roofColor: null, trimColor: '' },
    })
    expect(res.statusCode).toBe(200)
    const { update } = tx.userHomeConfig.upsert.mock.calls[0][0]
    expect(update).toMatchObject({ wallColor: '#A1b2C3', roofColor: null, trimColor: null })
  })

  test('rejects unknown template, palette and style enums', async () => {
    const res = await save({
      decorations: [],
      template: 'castle_v9',
      palette: 'neon',
      houseCustomizations: { doorStyle: 'portcullis' },
    })
    expect(res.statusCode).toBe(400)
    expect(Object.keys(res.jsonBody.fields).sort()).toEqual(['houseCustomizations.doorStyle', 'palette', 'template'])
  })

  test.each([
    ['far right', { positionX: 99999 }],
    ['far left', { positionX: -500 }],
    ['below the yard', { positionY: 1000 }],
    ['not a whole pixel', { positionX: 10.5 }],
  ])('rejects a decoration %s', async (_label, position) => {
    const res = await save({ decorations: [{ ...ROSES, ...position }] })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.error).toBe('A decoration is outside the yard.')
  })

  test('accepts an item hanging half off the edge, as centred placement makes', async () => {
    const res = await save({ decorations: [{ ...ROSES, positionX: -20, positionY: 340 }] })
    expect(res.statusCode).toBe(200)
  })

  test('caps the size of decoration data', async () => {
    const res = await save({ decorations: [{ ...ROSES, data: { text: 'x'.repeat(5000) } }] })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.fields['decorations.0.data']).toMatch(/at most/)
  })

  test('rejects terrain outside the grid or with unknown tiles', async () => {
    expect((await save({ decorations: [], terrain: { '99,3': 'water' } })).statusCode).toBe(400)
    expect((await save({ decorations: [], terrain: { '3,8': 'lava' } })).statusCode).toBe(400)
    expect((await save({ decorations: [], terrain: { '3,8': 'water' } })).statusCode).toBe(200)
  })
})

describe('which items may be placed', () => {
  test('rejects an item the user cannot use (unknown, locked, expired)', async () => {
    catalog([])
    const res = await save({ decorations: [ROSES, { ...ROSES, decorationId: 'gazebo' }] })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.fields).toEqual({
      'decorations.0.decorationId': "One of these decorations isn't available to you.",
      'decorations.1.decorationId': "One of these decorations isn't available to you.",
    })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  test('asks the catalog with the same availability rules as /api/decorations/available', async () => {
    await save({ decorations: [ROSES] })
    const { where } = mockDb.decorationItem.findMany.mock.calls[0][0]
    expect(where.AND[0]).toEqual({ itemId: { in: ['roses_red'] } })
    expect(where.AND[1].isActive).toBe(true)
    expect(where.AND[1].OR).toEqual(
      expect.arrayContaining([{ releaseType: 'DEFAULT' }, { userClaims: { some: { userId: 'user-1' } } }])
    )
  })

  test('keeps an item already in the yard even if it is no longer available', async () => {
    catalog([], ['gazebo'])
    const res = await save({ decorations: [{ ...ROSES, decorationType: 'structure', decorationId: 'gazebo' }] })
    expect(res.statusCode).toBe(200)
  })

  test("custom art must be the user's own upload", async () => {
    const own = { decorationType: 'custom', decorationId: 'custom_asset_2', zone: 'front_yard', positionX: 5, positionY: 5 }
    const ok = await save({
      decorations: [{ ...own, data: { customAssetUrl: 'https://cdn.test/pixel-homes/custom/user-1-1-abc.png', slot: 2 } }],
    })
    expect(ok.statusCode).toBe(200)

    const someoneElses = await save({
      decorations: [{ ...own, data: { customAssetUrl: 'https://cdn.test/pixel-homes/custom/user-2-1-abc.png', slot: 2 } }],
    })
    expect(someoneElses.statusCode).toBe(400)

    const tracker = await save({ decorations: [{ ...own, data: { customAssetUrl: 'https://evil.test/pixel.png' } }] })
    expect(tracker.statusCode).toBe(400)

    const badSlot = await save({ decorations: [{ ...own, decorationId: 'custom_asset_9' }] })
    expect(badSlot.statusCode).toBe(400)
  })

  test('custom art from an older CDN origin is fine if the user already uses it', async () => {
    const oldUrl = 'https://old-cdn.test/pixel-homes/custom/user-1-1-abc.png'
    mockDb.userHomeConfig.findUnique.mockResolvedValue({ customAssets: [{ slot: 0, url: oldUrl }] })
    const res = await save({
      decorations: [
        { decorationType: 'custom', decorationId: 'custom_asset_0', zone: 'front_yard', positionX: 5, positionY: 5, data: { customAssetUrl: oldUrl, slot: 0 } },
      ],
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('one transaction for the whole home', () => {
  test('upsert, delete and create all go through the transaction client, in order', async () => {
    const order: string[] = []
    tx.userHomeConfig.upsert.mockImplementation(async () => order.push('upsert'))
    tx.userHomeDecoration.deleteMany.mockImplementation(async () => order.push('deleteMany'))
    tx.userHomeDecoration.createMany.mockImplementation(async () => order.push('createMany'))

    const res = await save({ decorations: [ROSES], template: 'cabin_v1', palette: 'crt_glow' })

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toEqual({ ok: true, saved: 1 })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['upsert', 'deleteMany', 'createMany'])
    expect(tx.userHomeConfig.upsert.mock.calls[0][0].update).toMatchObject({ houseTemplate: 'cabin_v1', palette: 'crt_glow' })
    expect(tx.userHomeDecoration.createMany.mock.calls[0][0].data[0]).toMatchObject({
      userId: 'user-1',
      decorationId: 'roses_red',
      zone: 'front_yard',
      layer: 1,
      variant: 'default',
      size: 'medium',
    })
  })

  test('an empty yard still clears atomically (no createMany)', async () => {
    const res = await save({ decorations: [] })
    expect(res.statusCode).toBe(200)
    expect(tx.userHomeDecoration.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(tx.userHomeDecoration.createMany).not.toHaveBeenCalled()
  })

  test('a failure inside the transaction surfaces as 500, not silent success', async () => {
    tx.userHomeDecoration.createMany.mockRejectedValueOnce(new Error('db down'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await save({ decorations: [ROSES] })
    expect(res.statusCode).toBe(500)
    expect(res.jsonBody.error).toBe('The server hit a problem.')
  })
})
