/**
 * The pixel-home share snapshot against a real Postgres and the real
 * renderer, with R2 stubbed: what gets stored and when, that only homes a
 * signed-out visitor can see get one (and lose it when they go private),
 * and the lazy /api/home/<handle>/snapshot route. The page's og:image
 * wiring is in tests/api/__tests__/home-share-image.test.ts (the .tsx page
 * pulls in client code this project can't load).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import sharp from 'sharp'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

const CDN = 'https://cdn.test/'
jest.mock('@/lib/storage/r2', () => ({
  putObject: jest.fn(async ({ key }: { key: string }) => `https://cdn.test/${key}`),
  deleteObjects: jest.fn(async (keys: string[]) => ({ deleted: keys, failed: [] })),
  keyFromPublicUrl: (url: string) => (url.startsWith('https://cdn.test/') ? url.slice('https://cdn.test/'.length) : null),
}))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))

import { putObject, deleteObjects } from '@/lib/storage/r2'
import { refreshHomeSnapshot, scheduleHomeSnapshot, planHomeSnapshot } from '@/lib/pixel-homes/snapshot/service'
import snapshotRoute from '@/pages/api/home/[handle]/snapshot'

const put = putObject as jest.Mock
const del = deleteObjects as jest.Mock

let seq = 0
async function resident(handle: string, visibility: Visibility | null = 'public', { home = true } = {}) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      primaryHandle: handle,
      handles: { create: { handle, host: SITE_NAME } },
      ...(visibility === null ? {} : { profile: { create: { displayName: handle, visibility } } }),
    },
  })
  if (home) {
    await db.userHomeConfig.create({ data: { userId: id, houseTemplate: 'cabin_v1', palette: 'pixel_petals' } })
    await db.userHomeDecoration.create({
      data: { userId: id, decorationType: 'plant', decorationId: 'roses_red', zone: 'front_yard', positionX: 64, positionY: 240 },
    })
  }
  return id
}

const stored = (userId: string) =>
  db.userHomeConfig.findUnique({
    where: { userId },
    select: { snapshotUrl: true, snapshotCardUrl: true, snapshotHash: true, snapshotAt: true },
  })

async function get(handle: string, query: Record<string, string> = {}) {
  const req = { method: 'GET', query: { handle, ...query }, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
    redirect(code: number, url: string) {
      this.statusCode = code
      this.location = url
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value
    },
  }
  await snapshotRoute(req, res as NextApiResponse)
  return res as { statusCode: number; location?: string; headers: Record<string, string> }
}

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "DecorationItem" RESTART IDENTITY CASCADE')
})

beforeEach(() => {
  put.mockClear()
  del.mockClear()
})

describe('refreshHomeSnapshot', () => {
  let alice: string
  beforeAll(async () => {
    alice = await resident('alice')
  })

  test('draws and stores a 1200×630 image and a card under versioned keys', async () => {
    const result = await refreshHomeSnapshot(alice)
    expect(result.status).toBe('rendered')

    const row = await stored(alice)
    expect(row!.snapshotHash).toMatch(/^[0-9a-f]{16}$/)
    const key = `pixel-homes/snapshots/${alice}.${row!.snapshotHash}`
    expect(row!.snapshotUrl).toBe(`${CDN}${key}.png`)
    expect(row!.snapshotCardUrl).toBe(`${CDN}${key}.card.png`)
    expect(row!.snapshotAt).toBeInstanceOf(Date)

    expect(put).toHaveBeenCalledTimes(2)
    const byKey = Object.fromEntries(put.mock.calls.map(([o]) => [o.key, o]))
    expect(byKey[`${key}.png`].contentType).toBe('image/png')
    expect(await sharp(byKey[`${key}.png`].body).metadata()).toMatchObject({ width: 1200, height: 630 })
    expect(await sharp(byKey[`${key}.card.png`].body).metadata()).toMatchObject({ width: 512, height: 352 })
  })

  test('an unchanged yard is not drawn again', async () => {
    const before = await stored(alice)
    expect(await refreshHomeSnapshot(alice)).toEqual({
      status: 'unchanged',
      url: before!.snapshotUrl,
      cardUrl: before!.snapshotCardUrl,
    })
    expect(put).not.toHaveBeenCalled()
  })

  test('a changed yard gets a new image at a new URL, and the old one is deleted', async () => {
    const before = await stored(alice)
    await db.userHomeDecoration.updateMany({ where: { userId: alice }, data: { positionX: 200 } })

    const result = await refreshHomeSnapshot(alice)
    expect(result.status).toBe('rendered')
    const after = await stored(alice)
    expect(after!.snapshotHash).not.toBe(before!.snapshotHash)
    expect(after!.snapshotUrl).not.toBe(before!.snapshotUrl)
    expect(del).toHaveBeenCalledWith(
      [before!.snapshotUrl!.slice(CDN.length), before!.snapshotCardUrl!.slice(CDN.length)],
      expect.anything()
    )
  })

  test('changing only text that is not drawn (the house description) keeps the image', async () => {
    await db.userHomeConfig.update({ where: { userId: alice }, data: { houseDescription: 'hello' } })
    expect((await refreshHomeSnapshot(alice)).status).toBe('unchanged')
  })

  test('the house colour is drawn, so changing it redraws', async () => {
    await db.userHomeConfig.update({ where: { userId: alice }, data: { roofColor: '#FF00FF' } })
    expect((await refreshHomeSnapshot(alice)).status).toBe('rendered')
  })

  test('saves in a burst draw at most twice, ending with the latest yard', async () => {
    await db.userHomeDecoration.updateMany({ where: { userId: alice }, data: { positionX: 100 } })
    const runs = [scheduleHomeSnapshot(alice), scheduleHomeSnapshot(alice), scheduleHomeSnapshot(alice)]
    const results = await Promise.all(runs)
    expect(new Set(runs).size).toBe(1) // one queue for the home
    expect(results[0]?.status).toBe('unchanged') // the queued rerun found nothing new
    expect(put).toHaveBeenCalledTimes(2) // one drawing: og + card
    expect((await planHomeSnapshot(alice)).action).toBe('up-to-date')
  })

  test('a resident with no home yet gets nothing', async () => {
    const nohome = await resident('nohome', 'public', { home: false })
    expect(await refreshHomeSnapshot(nohome)).toEqual({ status: 'no-home' })
    expect(put).not.toHaveBeenCalled()
  })
})

describe('hidden homes get no snapshot', () => {
  test.each(['private', 'followers', 'friends'] as const)('a %s home is never drawn', async (visibility) => {
    const id = await resident(`hidden_${visibility}`, visibility)
    expect(await refreshHomeSnapshot(id)).toEqual({ status: 'hidden' })
    expect(put).not.toHaveBeenCalled()
    expect((await stored(id))!.snapshotUrl).toBeNull()
  })

  test('a home with no profile row is public, and is drawn', async () => {
    const id = await resident('noprofile', null)
    expect((await refreshHomeSnapshot(id)).status).toBe('rendered')
  })

  test('a home that goes private loses the snapshot it had', async () => {
    const id = await resident('goesprivate')
    await refreshHomeSnapshot(id)
    const had = await stored(id)
    expect(had!.snapshotUrl).toBeTruthy()

    await db.profile.update({ where: { userId: id }, data: { visibility: 'private' } })
    expect(await refreshHomeSnapshot(id)).toEqual({ status: 'hidden' })
    expect(await stored(id)).toEqual({ snapshotUrl: null, snapshotCardUrl: null, snapshotHash: null, snapshotAt: null })
    expect(del).toHaveBeenCalledWith(
      [had!.snapshotUrl!.slice(CDN.length), had!.snapshotCardUrl!.slice(CDN.length)],
      expect.anything()
    )
  })
})

describe('GET /api/home/<handle>/snapshot', () => {
  beforeAll(async () => {
    await resident('lazy')
    await resident('secret', 'private')
    await resident('pals', 'followers')
  })

  test('draws a missing snapshot on first request, then redirects to it', async () => {
    expect((await stored('u_lazy'))!.snapshotUrl).toBeNull()
    const res = await get('lazy')
    const row = await stored('u_lazy')
    expect(res.statusCode).toBe(302)
    expect(res.location).toBe(row!.snapshotUrl)
    expect(put).toHaveBeenCalledTimes(2)

    put.mockClear()
    const again = await get('@Lazy')
    expect(again.location).toBe(row!.snapshotUrl)
    expect(put).not.toHaveBeenCalled()
  })

  test('?size=card redirects to the card', async () => {
    const res = await get('lazy', { size: 'card' })
    expect(res.location).toBe((await stored('u_lazy'))!.snapshotCardUrl)
  })

  test('a hidden home is a 404, and nothing is drawn', async () => {
    expect((await get('secret')).statusCode).toBe(404)
    expect((await get('pals')).statusCode).toBe(404)
    expect((await get('nobody')).statusCode).toBe(404)
    expect(put).not.toHaveBeenCalled()
  })

  test('a stored snapshot of a home that has since gone private is not served', async () => {
    const id = await resident('wasopen')
    await refreshHomeSnapshot(id)
    await db.profile.update({ where: { userId: id }, data: { visibility: 'private' } })
    expect((await get('wasopen')).statusCode).toBe(404)
  })
})
