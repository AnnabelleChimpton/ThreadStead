/**
 * "New from PNG" against a real Postgres, with R2 stubbed: the checks, a new
 * item from a filename, versions that never overwrite, revert as a pointer
 * change, and the stored size reaching the yard the canvas draws.
 */
import fs from 'fs'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'
import sharp from 'sharp'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))
// Never the real bucket
const stored = new Map<string, Buffer>()
jest.mock('@/lib/storage/r2', () => ({
  putObject: jest.fn(async ({ key, body }: { key: string; body: Buffer }) => {
    stored.set(key, body)
    return `https://cdn.test/${key}`
  }),
}))

import checkHandler from '@/pages/api/admin/decorations/sprites/check'
import publishHandler from '@/pages/api/admin/decorations/sprites/index'
import versionsHandler from '@/pages/api/admin/decorations/[id]/versions'
import { getSessionUser } from '@/lib/auth/server'
import { loadCatalogArt, toSceneDecorations } from '@/lib/pixel-homes/home-scene'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown

async function call(handler: Handler, user: object | null, body: unknown, { method = 'POST', query = {} }: { method?: string; query?: object } = {}) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(user)
  const req = { method, body, query, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; return this },
    setHeader: jest.fn(),
  }
  await handler(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

const preview = (name: string) => fs.readFileSync(path.join(process.cwd(), 'design/pixel-art/remap-preview', name))
const dataUrl = (buf: Buffer) => `data:image/png;base64,${buf.toString('base64')}`

let admin: { id: string; role: 'admin' }
const member = { id: 'u_member', role: 'member' }

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "DecorationItem" RESTART IDENTITY CASCADE')
  await db.user.create({ data: { id: 'u_admin', did: 'did:test:admin', role: 'admin', handles: { create: { handle: 'admin', host: SITE_NAME } } } })
  await db.user.create({ data: { id: member.id, did: 'did:test:member', handles: { create: { handle: 'member', host: SITE_NAME } } } })
  admin = { id: 'u_admin', role: 'admin' }
  // Her roses as they are live today: an old unversioned PNG with no stored size
  await db.decorationItem.create({
    data: { id: 'di_roses_red', itemId: 'roses_red', name: 'Red Roses', type: 'plant', category: 'plants', zone: 'front_yard', releaseType: 'DEFAULT', pngUrl: 'https://cdn.test/pixel-homes/decorations/roses_red.png' },
  })
})

afterAll(() => db.$disconnect())

test('admins only', async () => {
  const res = await call(checkHandler, member, { filename: 'plant_x.png', imageData: dataUrl(preview('roses_red.png')) })
  expect(res.statusCode).toBe(403)
})

test('check reads the name and picture and writes nothing', async () => {
  const res = await call(checkHandler, admin, { filename: 'plant_roses_red.png', imageData: dataUrl(preview('before/roses_red.png')) })
  expect(res.statusCode).toBe(200)
  expect(res.body).toMatchObject({
    name: { itemId: 'roses_red', type: 'plant', frames: 1 },
    frameWidth: 24,
    height: 19,
    trimBottom: 5,
    needsOverride: true,
    blocked: false,
    existing: { id: 'di_roses_red', pngVersion: null, artVersions: [] },
  })
  expect(stored.size).toBe(0)
})

test('a bad name says what is wrong', async () => {
  const res = await call(checkHandler, admin, { filename: 'roses.png', imageData: dataUrl(preview('roses_red.png')) })
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toMatch(/has to start with a type/)
})

test('off-palette art needs "upload anyway"', async () => {
  const res = await call(publishHandler, admin, { filename: 'plant_roses_red.png', imageData: dataUrl(preview('before/roses_red.png')) })
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toMatch(/Upload anyway/)
  expect(stored.size).toBe(0)
})

test('a new version of an existing item: trimmed, stored at v1, size on the item', async () => {
  const res = await call(publishHandler, admin, { filename: 'plant_roses_red.png', imageData: dataUrl(preview('roses_red.png')) })
  expect(res.statusCode).toBe(200)
  expect(res.body).toMatchObject({ version: 1, created: false })
  const item = await db.decorationItem.findUniqueOrThrow({ where: { itemId: 'roses_red' } })
  expect(item).toMatchObject({
    pngUrl: 'https://cdn.test/pixel-homes/decorations/roses_red.v1.png',
    width: 24, height: 19, frames: 1, pngVersion: 1, gridWidth: 2, gridHeight: 2,
    releaseType: 'DEFAULT', // an existing item keeps its release
  })
  const png = stored.get('pixel-homes/decorations/roses_red.v1.png')!
  expect(await sharp(png).metadata()).toMatchObject({ width: 24, height: 19 })
})

test('uploading again makes v2 and keeps v1; revert points back', async () => {
  await call(publishHandler, admin, { filename: 'plant_roses_red.png', imageData: dataUrl(preview('roses_pink.png')) })
  let item = await db.decorationItem.findUniqueOrThrow({ where: { itemId: 'roses_red' } })
  expect(item.pngUrl).toBe('https://cdn.test/pixel-homes/decorations/roses_red.v2.png')
  expect(stored.has('pixel-homes/decorations/roses_red.v1.png')).toBe(true)

  const list = await call(versionsHandler, admin, undefined, { method: 'GET', query: { id: item.id } })
  expect(list.body.current).toBe(2)
  expect(list.body.versions.map((v: { version: number }) => v.version)).toEqual([2, 1])

  const back = await call(versionsHandler, admin, { version: 1 }, { query: { id: item.id } })
  expect(back.statusCode).toBe(200)
  item = await db.decorationItem.findUniqueOrThrow({ where: { itemId: 'roses_red' } })
  expect(item).toMatchObject({ pngVersion: 1, pngUrl: 'https://cdn.test/pixel-homes/decorations/roses_red.v1.png' })
  expect(await db.decorationArtVersion.count({ where: { decorationId: item.id } })).toBe(2)

  const missing = await call(versionsHandler, admin, { version: 9 }, { query: { id: item.id } })
  expect(missing.statusCode).toBe(404)
})

test('a new filename makes a new ADMIN_ONLY item the uploader can place', async () => {
  // A 2-frame strip made from the pine: 40×44
  const pine = preview('tree_pine.png')
  const strip = await sharp({ create: { width: 40, height: 44, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: pine, left: 0, top: 0 }, { input: pine, left: 20, top: 0 }])
    .png()
    .toBuffer()
  const res = await call(publishHandler, admin, {
    filename: 'plant_swaying_pine@2f.png',
    imageData: dataUrl(strip),
    collection: 'Autumn 2026',
  })
  expect(res.statusCode).toBe(201)
  const item = await db.decorationItem.findUniqueOrThrow({ where: { itemId: 'swaying_pine' }, include: { userClaims: true } })
  expect(item).toMatchObject({
    name: 'Swaying Pine', type: 'plant', category: 'plants', zone: 'front_yard',
    releaseType: 'ADMIN_ONLY', collection: 'Autumn 2026', width: 20, height: 44, frames: 2, createdBy: 'u_admin',
  })
  expect(item.userClaims).toEqual([expect.objectContaining({ userId: 'u_admin', claimMethod: 'ADMIN_GRANT' })])
})

test("a type that doesn't match the item is refused", async () => {
  const res = await call(publishHandler, admin, { filename: 'feature_roses_red.png', imageData: dataUrl(preview('roses_red.png')) })
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe('roses_red is already a plant, not a feature. Rename the file to plant_roses_red.png.')
})

test('the stored size reaches the yard: placed at its own size, frames carried along', async () => {
  const catalog = await loadCatalogArt(['swaying_pine', 'roses_red'])
  const rows = [
    { id: 1, decorationId: 'swaying_pine', decorationType: 'plant', positionX: 32, positionY: 200, size: 'medium' },
    { id: 2, decorationId: 'roses_red', decorationType: 'plant', positionX: 64, positionY: 200, size: 'medium' },
  ] as any
  const [pine, roses] = toSceneDecorations(rows, catalog, null)
  expect(pine).toMatchObject({ pngWidth: 20, pngHeight: 44, pngFrames: 2 })
  expect(roses).toMatchObject({ pngWidth: 24, pngHeight: 19 })
  expect(roses.pngFrames).toBeUndefined()
  expect(getDecorationDimensions('roses_red', 'plant', 'medium', roses)).toEqual({ width: 24, height: 19 })
  // Feet (bottom edge) drive depth: 200 + 19, not the old table's 24
  expect(roses.position.layer).toBe(300000 + 219 * 1000 + 64)
})
