/**
 * POST /api/home/decorations/save against a real Postgres: which catalog
 * items a resident may place (the same rules as /api/decorations/available,
 * plus items already in their yard), and that a failure part-way through
 * rolls back the WHOLE save, house config included.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
// The CSRF token is the browser's job; these call the route directly
jest.mock('@/lib/server/http/csrf', () => ({
  ...jest.requireActual('@/lib/server/http/csrf'),
  csrfProtection: jest.fn(async () => true),
}))
// The snapshot redraw after a save has its own tests (home-snapshot.dbtest.ts).
jest.mock('@/lib/pixel-homes/snapshot/service', () => ({ scheduleHomeSnapshot: jest.fn(async () => null) }))

import handler from '@/pages/api/home/decorations/save'
import { getSessionUser } from '@/lib/auth/server'

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

async function save(user: { id: string; betaKey?: unknown }, body: any) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(user)
  const req = { method: 'POST', body, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
    setHeader: jest.fn(),
  }
  await handler(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

const place = (decorationId: string, positionX = 32) => ({
  decorationType: 'plant',
  decorationId,
  zone: 'front_yard',
  positionX,
  positionY: 200,
})

async function person(handle: string) {
  const id = `u_${handle}`
  await db.user.create({ data: { id, did: `did:test:${handle}`, handles: { create: { handle, host: SITE_NAME } } } })
  return { id, betaKey: null as unknown }
}

let alice: { id: string; betaKey: unknown }
let beta: { id: string; betaKey: unknown }

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "DecorationItem" RESTART IDENTITY CASCADE')
  alice = await person('alice')
  beta = await person('betty')
  beta.betaKey = await db.betaKey.create({ data: { key: 'beta-test-key', usedBy: beta.id } })

  const item = (itemId: string, extra: Record<string, unknown> = {}) => ({
    id: `di_${itemId}`,
    itemId,
    name: itemId,
    type: 'plant',
    category: 'plants',
    zone: 'front_yard',
    ...extra,
  })
  await db.decorationItem.createMany({
    data: [
      item('roses_red', { releaseType: 'DEFAULT' }),
      item('tree_pine', { releaseType: 'PUBLIC' }),
      item('retired_bench', { releaseType: 'PUBLIC', isActive: false }),
      item('beta_gazebo', { releaseType: 'BETA_USERS' }),
      item('spooky_pumpkin', { releaseType: 'LIMITED_TIME', releaseStartAt: new Date(now - DAY), releaseEndAt: new Date(now + DAY) }),
      item('last_year_pumpkin', { releaseType: 'LIMITED_TIME', releaseStartAt: new Date(now - 400 * DAY), releaseEndAt: new Date(now - 300 * DAY) }),
      item('golden_gnome', { releaseType: 'CLAIM_CODE', claimCode: 'GNOME' }),
      item('admin_flag', { releaseType: 'ADMIN_ONLY' }),
    ],
  })
  await db.userDecorationClaim.create({ data: { userId: alice.id, decorationId: 'di_golden_gnome' } })
})

afterAll(() => db.$disconnect())

describe('which catalog items a resident may place', () => {
  test.each([
    ['a default item', 'roses_red'],
    ['a public item', 'tree_pine'],
    ['a limited release that is running', 'spooky_pumpkin'],
    ['an item they claimed', 'golden_gnome'],
  ])('allows %s', async (_label, itemId) => {
    expect((await save(alice, { decorations: [place(itemId)] })).statusCode).toBe(200)
  })

  test.each([
    ['an unknown item', 'made_up_item'],
    ['a retired item', 'retired_bench'],
    ['a beta item for a non-beta user', 'beta_gazebo'],
    ['a limited release that has ended', 'last_year_pumpkin'],
    ['a claim-code item nobody gave them', 'admin_flag'],
  ])('refuses %s', async (_label, itemId) => {
    await db.userHomeDecoration.deleteMany({ where: { userId: alice.id } })
    const res = await save(alice, { decorations: [place('roses_red'), place(itemId, 64)] })
    expect(res.statusCode).toBe(400)
    expect(res.body.fields).toEqual({ 'decorations.1.decorationId': "One of these decorations isn't available to you." })
  })

  test('beta users get beta items', async () => {
    expect((await save(beta, { decorations: [place('beta_gazebo')] })).statusCode).toBe(200)
  })

  test("someone else's claim doesn't count", async () => {
    expect((await save(beta, { decorations: [place('golden_gnome')] })).statusCode).toBe(400)
  })

  test('an ended limited release stays in a yard that already has it', async () => {
    await db.userHomeDecoration.deleteMany({ where: { userId: alice.id } })
    await db.userHomeDecoration.create({
      data: { userId: alice.id, decorationType: 'plant', decorationId: 'last_year_pumpkin', zone: 'front_yard', positionX: 10, positionY: 200 },
    })
    // moved, and a second copy added: still theirs to keep
    const res = await save(alice, { decorations: [place('last_year_pumpkin', 100), place('last_year_pumpkin', 140)] })
    expect(res.statusCode).toBe(200)
    expect(await db.userHomeDecoration.count({ where: { userId: alice.id, decorationId: 'last_year_pumpkin' } })).toBe(2)
  })
})

describe('one transaction', () => {
  test('a failure while writing decorations rolls back the house config and keeps the old yard', async () => {
    await save(alice, { decorations: [place('roses_red', 16), place('tree_pine', 48)], template: 'cottage_v1', palette: 'thread_sage' })
    const before = await db.userHomeDecoration.findMany({ where: { userId: alice.id }, orderBy: { positionX: 'asc' } })
    expect(before.map((d) => d.decorationId)).toEqual(['roses_red', 'tree_pine'])

    // Make createMany fail inside the real transaction, after the upsert and the delete ran
    const realTransaction = db.$transaction.bind(db) as any
    const spy = jest.spyOn(db, '$transaction').mockImplementationOnce(((fn: (tx: any) => Promise<unknown>) =>
      realTransaction(async (tx: any) => {
        const bound = (target: any, prop: PropertyKey) => {
          const value = Reflect.get(target, prop)
          return typeof value === 'function' ? value.bind(target) : value
        }
        const decorations = new Proxy(tx.userHomeDecoration, {
          get: (target, prop) => (prop === 'createMany' ? async () => { throw new Error('disk full') } : bound(target, prop)),
        })
        return fn(new Proxy(tx, { get: (target, prop) => (prop === 'userHomeDecoration' ? decorations : bound(target, prop)) }))
      })) as any)
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const res = await save(alice, {
      decorations: [place('spooky_pumpkin', 200)],
      template: 'cabin_v1',
      palette: 'crt_glow',
      houseCustomizations: { wallColor: '#123456' },
    })
    spy.mockRestore()
    consoleError.mockRestore()

    expect(res.statusCode).toBe(500)
    const config = await db.userHomeConfig.findUnique({ where: { userId: alice.id } })
    expect(config).toMatchObject({ houseTemplate: 'cottage_v1', palette: 'thread_sage' })
    expect(config?.wallColor).not.toBe('#123456')
    const after = await db.userHomeDecoration.findMany({ where: { userId: alice.id }, orderBy: { positionX: 'asc' } })
    expect(after.map((d) => d.id)).toEqual(before.map((d) => d.id))
  })

  test('a good save replaces the config and the yard together', async () => {
    const res = await save(alice, {
      decorations: [place('spooky_pumpkin', 200)],
      template: 'cabin_v1',
      palette: 'crt_glow',
      houseCustomizations: { wallColor: '#123456', roofColor: null },
      terrain: { '3,8': 'water' },
    })
    expect(res.statusCode).toBe(200)
    expect(await db.userHomeConfig.findUnique({ where: { userId: alice.id } })).toMatchObject({
      houseTemplate: 'cabin_v1',
      palette: 'crt_glow',
      wallColor: '#123456',
      roofColor: null,
      terrain: { '3,8': 'water' },
    })
    const yard = await db.userHomeDecoration.findMany({ where: { userId: alice.id } })
    expect(yard.map((d) => [d.decorationId, d.positionX])).toEqual([['spooky_pumpkin', 200]])
  })

  test('the first save creates the config', async () => {
    const carol = await person('carol')
    const res = await save(carol, { decorations: [place('roses_red')], houseCustomizations: { wallColor: '#abcdef' } })
    expect(res.statusCode).toBe(200)
    expect(await db.userHomeConfig.findUnique({ where: { userId: carol.id } })).toMatchObject({
      houseTemplate: 'cottage_v1',
      palette: 'thread_sage',
      wallColor: '#abcdef',
      windowStyle: 'default',
      preferPixelHome: true,
    })
  })
})
