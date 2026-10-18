/**
 * The homepage's New Neighbors widget asks /api/directory for settled=1:
 * only accounts at least SETTLE_HOURS old that have done one thing here
 * (a public post, a house change, a guestbook entry from someone else).
 * The full directory still lists everyone. Against a real Postgres, since
 * the filter is raw SQL.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({
  ...jest.requireActual('@/lib/auth/server'),
  getSessionUser: jest.fn(async () => null),
}))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))

import directory from '@/pages/api/directory'
import { SETTLE_HOURS } from '@/lib/domain/users/new-neighbors'
import { utc } from '@/lib/indie-index/sql'

const HOUR = 60 * 60 * 1000

async function call(query: Record<string, string>) {
  const req = { method: 'GET', url: '/api/directory', query, headers: {}, cookies: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader() { return this },
    end() { return this },
  }
  await directory(req, res as NextApiResponse)
  return res
}

const names = (res: any): string[] => res.body.users.map((u: any) => u.username)
const newNeighbors = () => call({ limit: '10', sortBy: 'recent', settled: '1' })

/** An account `hoursOld` hours old, with the house config verify.ts makes at signup. */
async function resident(handle: string, hoursOld: number) {
  const createdAt = new Date(Date.now() - hoursOld * HOUR)
  const user = await db.user.create({
    data: {
      id: `u_${handle}`,
      did: `did:test:${handle}`,
      createdAt,
      handles: { create: { handle, host: SITE_NAME } },
      profile: { create: { displayName: handle, bio: `${handle} bio` } },
    },
  })
  // @updatedAt ignores a passed value on create, so set both afterwards
  await db.userHomeConfig.create({ data: { userId: user.id } })
  await db.$executeRaw`UPDATE "UserHomeConfig" SET "createdAt" = ${utc(createdAt)}, "updatedAt" = ${utc(createdAt)} WHERE "userId" = ${user.id}`
  return user.id
}

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.$disconnect()
})

describe('settled=1', () => {
  it('leaves out an old account that has done nothing', async () => {
    await resident('quiet', SETTLE_HOURS + 100)
    expect(names(await newNeighbors())).toEqual([])
  })

  it('counts a public post, but not a private one', async () => {
    const poster = await resident('poster', SETTLE_HOURS + 1)
    const diarist = await resident('diarist', SETTLE_HOURS + 1)
    await db.post.create({ data: { authorId: poster, title: 'hi', visibility: 'public' } })
    await db.post.create({ data: { authorId: diarist, title: 'mine', visibility: 'private' } })
    expect(names(await newNeighbors())).toEqual(['poster'])
  })

  it('counts a house saved after signup, or any decoration', async () => {
    const painter = await resident('painter', SETTLE_HOURS + 1)
    const gardener = await resident('gardener', SETTLE_HOURS + 2)
    await db.userHomeConfig.update({ where: { userId: painter }, data: { wallColor: '#336699' } })
    await db.userHomeDecoration.create({
      data: { userId: gardener, decorationType: 'plant', decorationId: 'roses_red', zone: 'front_yard', positionX: 1, positionY: 1 },
    })
    expect(names(await newNeighbors())).toEqual(['painter', 'gardener'])
  })

  it("counts a visible guestbook entry from someone else, not one they wrote themselves or one that's hidden", async () => {
    const welcomed = await resident('welcomed', SETTLE_HOURS + 1)
    const selfie = await resident('selfie', SETTLE_HOURS + 1)
    const hidden = await resident('hidden', SETTLE_HOURS + 1)
    const friend = await resident('friend', 1000)
    await db.guestbookEntry.create({ data: { profileOwner: welcomed, authorId: friend, message: 'welcome!' } })
    await db.guestbookEntry.create({ data: { profileOwner: selfie, authorId: selfie, message: 'me' } })
    await db.guestbookEntry.create({ data: { profileOwner: hidden, authorId: friend, message: 'buy essays', status: 'hidden' } })
    expect(names(await newNeighbors())).toEqual(['welcomed'])
  })

  it(`waits until an account is ${SETTLE_HOURS} hours old, however busy it is`, async () => {
    const eager = await resident('eager', SETTLE_HOURS - 1)
    await db.post.create({ data: { authorId: eager, title: 'buy essays', visibility: 'public' } })
    await db.userHomeConfig.update({ where: { userId: eager }, data: { houseTitle: 'Law Essay Pros' } })
    expect(names(await newNeighbors())).toEqual([])

    await db.user.update({ where: { id: eager }, data: { createdAt: new Date(Date.now() - (SETTLE_HOURS + 1) * HOUR) } })
    expect(names(await newNeighbors())).toEqual(['eager'])
  })

  it('keeps the directory filters, newest first, and total still counts everyone', async () => {
    const a = await resident('older', SETTLE_HOURS + 10)
    const b = await resident('newer', SETTLE_HOURS + 5)
    const c = await resident('private', SETTLE_HOURS + 5)
    await resident('brandnew', 1)
    for (const id of [a, b, c]) await db.post.create({ data: { authorId: id, title: 'hi', visibility: 'public' } })
    await db.profile.update({ where: { userId: c }, data: { visibility: 'private' } })

    const res = await newNeighbors()
    expect(names(res)).toEqual(['newer', 'older'])
    expect(res.body.total).toBe(3) // older, newer, brandnew: the "View all" count
  })
})

it('without settled=1 the directory lists everyone, newest first', async () => {
  await resident('quiet', SETTLE_HOURS + 100)
  await resident('brandnew', 1)
  const res = await call({ sortBy: 'recent' })
  expect(names(res)).toEqual(['brandnew', 'quiet'])
  expect(res.body.total).toBe(2)
})
