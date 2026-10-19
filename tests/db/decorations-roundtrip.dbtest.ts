/**
 * The pixel-home editor's whole round trip against a real Postgres:
 * the decorate page's server props → the editor document → edits through
 * the reducer → the save mapping → POST /api/home/decorations/save →
 * the decorate page and GET /api/home/decorations/load again.
 *
 * Reopening a saved home must give back exactly the document that was
 * saved, including catalog ids that end in digits (`lamp_post_2`), which
 * the old save mapping parsed out of instance ids with a regex.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import {
  createEditorState,
  docFromProps,
  docKey,
  editorReducer,
  newPlacement,
  toSavePayload,
  type EditorAction,
  type EditorDoc,
} from '@/lib/pixel-homes/editor-doc'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/pixel-homes/snapshot/service', () => ({ scheduleHomeSnapshot: jest.fn(async () => null) }))
// Only the page's getServerSideProps runs here, not its React tree
jest.mock('@/components/ui/layout/Layout', () => () => null)
jest.mock('@/components/pixel-homes/DecorationMode', () => () => null)

import saveHandler from '@/pages/api/home/decorations/save'
import loadHandler from '@/pages/api/home/decorations/load'
import { getServerSideProps } from '@/pages/home/[handle]/decorate'
import { getSessionUser } from '@/lib/auth/server'

const HANDLE = 'roundtrip'
const me = { id: 'u_roundtrip', betaKey: null as unknown }

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined as any,
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
}

async function callApi(handler: any, req: Partial<NextApiRequest>) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(me)
  const res = fakeRes()
  await handler({ headers: {}, query: {}, ...req } as NextApiRequest, res as unknown as NextApiResponse)
  return res
}

/** What the editor opens with, read through the decorate page like a browser would. */
async function openEditor(): Promise<EditorDoc> {
  ;(getSessionUser as jest.Mock).mockResolvedValue(me)
  const result: any = await getServerSideProps({ params: { handle: HANDLE }, req: { headers: {} } } as any)
  expect(result.props).toBeDefined()
  const p = result.props
  return docFromProps({
    template: p.template,
    palette: p.palette,
    decorations: p.initialDecorations,
    house: p.initialHouseCustomizations,
    atmosphere: p.initialAtmosphere,
    terrain: p.initialTerrain,
  })
}

async function save(doc: EditorDoc) {
  return callApi(saveHandler, { method: 'POST', body: toSavePayload(doc) })
}

const edit = (doc: EditorDoc, ...actions: EditorAction[]) => actions.reduce(editorReducer, createEditorState(doc)).present

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "DecorationItem" RESTART IDENTITY CASCADE')
  await db.user.create({ data: { id: me.id, did: 'did:test:roundtrip', handles: { create: { handle: HANDLE, host: SITE_NAME } } } })
  const item = (itemId: string, type: string) => ({
    id: `di_${itemId}`,
    itemId,
    name: itemId,
    type,
    category: 'plants',
    zone: 'front_yard',
    releaseType: 'PUBLIC' as const,
  })
  await db.decorationItem.createMany({
    data: [item('roses_red', 'plant'), item('lamp_post_2', 'lighting'), item('sign_post', 'feature'), item('tree_pine', 'plant')],
  })

  // A yard saved by older code: a sign whose text lives in data, a digit-ending id
  await db.userHomeConfig.create({
    data: {
      userId: me.id,
      houseTemplate: 'cottage_v1',
      palette: 'thread_sage',
      wallColor: '#a1b2c3',
      houseTitle: 'My place',
      terrain: { '3,8': 'water' },
    },
  })
  const row = (decorationId: string, decorationType: string, positionX: number, data?: object) => ({
    userId: me.id,
    decorationId,
    decorationType,
    zone: 'front_yard',
    positionX,
    positionY: 240,
    layer: 1,
    ...(data && { data }),
  })
  await db.userHomeDecoration.createMany({
    data: [row('roses_red', 'plant', 64), row('lamp_post_2', 'lighting', 128), row('sign_post', 'feature', 192, { text: 'HI' })],
  })
})

afterAll(() => db.$disconnect())

test('the editor opens a stored home as it is, and re-saving it unchanged changes nothing', async () => {
  const opened = await openEditor()
  expect(opened.decorations.map((d) => d.decorationId)).toEqual(['roses_red', 'lamp_post_2', 'sign_post'])
  expect(opened.decorations[2].text).toBe('HI')
  expect(opened.house).toMatchObject({ wallColor: '#a1b2c3', houseTitle: 'My place' })
  expect(opened.terrain).toEqual({ '3,8': 'water' })

  expect((await save(opened)).statusCode).toBe(200)
  expect(docKey(await openEditor())).toBe(docKey(opened))
})

test('every kind of edit survives save and reload', async () => {
  const opened = await openEditor()
  const [rose, lamp, sign] = opened.decorations
  const lampItem = { id: 'lamp_post_2', name: 'Lamp', type: 'lighting' as const }

  const edited = edit(
    opened,
    { type: 'place', decoration: newPlacement(lampItem, { x: 300, y: 260, layer: 300 }) },
    { type: 'place', decoration: newPlacement(lamp, { x: 340, y: 260, layer: 300 }) }, // a copy of a placed copy
    { type: 'move', id: rose.id, position: { x: 80.4, y: 255.6, layer: 1 } },
    { type: 'updateDecoration', id: sign.id, changes: { text: 'HELLO' }, mergeKey: 'sign' },
    { type: 'beginStroke' },
    { type: 'paintCell', key: '4,8', tile: 'stone_path' },
    { type: 'paintCell', key: '3,8', tile: null },
    { type: 'endStroke' },
    { type: 'setTheme', template: 'cabin_v1', palette: 'crt_glow' },
    { type: 'setAtmosphere', changes: { sky: 'night' } },
    { type: 'setHouse', changes: { wallColor: undefined, doorStyle: 'arched', houseNumber: '12', houseNumberStyle: 'classic' } },
  )

  const res = await save(edited)
  expect(res.body).toEqual({ ok: true, saved: 5 })

  const reopened = await openEditor()
  expect(docKey(reopened)).toBe(docKey(edited))
  expect(reopened.decorations.filter((d) => d.decorationId === 'lamp_post_2')).toHaveLength(3)
  expect(reopened.decorations.find((d) => d.decorationId === 'roses_red')?.position).toMatchObject({ x: 80, y: 256 })
  expect(reopened.decorations.find((d) => d.decorationId === 'sign_post')?.text).toBe('HELLO')
  // the reset wall colour went as null and cleared the column
  expect(reopened.house.wallColor ?? null).toBeNull()

  // the visitor view reads the same yard
  const load = await callApi(loadHandler, { method: 'GET', query: { username: HANDLE } })
  expect(load.statusCode).toBe(200)
  expect(load.body.decorations.map((d: any) => d.decorationId).sort()).toEqual(
    ['lamp_post_2', 'lamp_post_2', 'lamp_post_2', 'roses_red', 'sign_post']
  )
  expect(load.body.terrain).toEqual({ '4,8': 'stone_path' })
  expect(load.body.atmosphere.sky).toBe('night')
})

test('clearing a sign and removing everything stick', async () => {
  const opened = await openEditor()
  const sign = opened.decorations.find((d) => d.decorationId === 'sign_post')!
  const cleared = edit(opened, { type: 'updateDecoration', id: sign.id, changes: { text: '' } })
  expect((await save(cleared)).statusCode).toBe(200)
  expect((await openEditor()).decorations.find((d) => d.decorationId === 'sign_post')?.text).toBeUndefined()

  const empty = edit(opened, { type: 'remove', ids: opened.decorations.map((d) => d.id) })
  expect((await save(empty)).statusCode).toBe(200)
  expect((await openEditor()).decorations).toEqual([])
})
