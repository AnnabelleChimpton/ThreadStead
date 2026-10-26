/**
 * Blocking and unblocking, against a real Postgres. An id that wasn't text
 * went into the unblock filter as a Prisma condition, so unblocking one
 * person could clear your whole list; a made-up id to block was a 500.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/server/http/csrf', () => ({
  ...jest.requireActual('@/lib/server/http/csrf'),
  csrfProtection: jest.fn(async () => true),
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  ...jest.requireActual('@/lib/server/http/rate-limit'),
  rateLimitCheck: jest.fn(async () => true),
}))

import blocksRoute from '@/pages/api/blocks/index'
import userBlockRoute from '@/pages/api/users/block'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
const dids = [`did:key:blocker-${stamp}`, `did:key:blocked-a-${stamp}`, `did:key:blocked-b-${stamp}`]
let cookie: string
let meId: string
let aId: string
let bId: string

async function call(route: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>, method: string, body: unknown) {
  const req = { method, url: '/api/blocks', query: {}, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v; return this },
    getHeader(k: string) { return this.headers[k.toLowerCase()] },
    end() { return this },
  }
  await route(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

const myBlocks = () => db.userBlock.count({ where: { blockerId: meId } })

beforeAll(async () => {
  ;[meId, aId, bId] = await Promise.all(dids.map(async (did) => (await db.user.create({ data: { did } })).id))
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, meId)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

beforeEach(async () => {
  await db.userBlock.deleteMany({ where: { blockerId: meId } })
  await db.userBlock.createMany({ data: [{ blockerId: meId, blockedUserId: aId }, { blockerId: meId, blockedUserId: bId }] })
})

afterAll(async () => {
  await db.user.deleteMany({ where: { did: { in: dids } } })
  await db.$disconnect()
})

test("Settings' unblock with an id that isn't text is a 400 and clears nothing", async () => {
  const res = await call(blocksRoute, 'DELETE', { blockedUserId: { not: 'x' } })
  expect(res.statusCode).toBe(400)
  expect(await myBlocks()).toBe(2)
})

test("Settings' unblock takes off the one person", async () => {
  const res = await call(blocksRoute, 'DELETE', { blockedUserId: aId })
  expect(res.statusCode).toBe(200)
  expect(await myBlocks()).toBe(1)
})

test("the block button's unblock with an id that isn't text is a 400 and clears nothing", async () => {
  const res = await call(userBlockRoute, 'POST', { targetUserId: { not: 'x' }, action: 'unblock' })
  expect(res.statusCode).toBe(400)
  expect(await myBlocks()).toBe(2)
})

test("blocking an id that's nobody is a 404, not a 500", async () => {
  const res = await call(userBlockRoute, 'POST', { targetUserId: `nobody-${stamp}`, action: 'block' })
  expect(res.statusCode).toBe(404)
})

test('the block button blocks and unblocks', async () => {
  await db.userBlock.deleteMany({ where: { blockerId: meId } })
  expect((await call(userBlockRoute, 'POST', { targetUserId: aId, action: 'block' })).statusCode).toBe(200)
  expect(await myBlocks()).toBe(1)
  expect((await call(userBlockRoute, 'POST', { targetUserId: aId, action: 'unblock' })).statusCode).toBe(200)
  expect(await myBlocks()).toBe(0)
})

test("a block's reason that isn't text is a 400, not a 500", async () => {
  await db.userBlock.deleteMany({ where: { blockerId: meId } })
  const res = await call(blocksRoute, 'POST', { blockedUserId: aId, reason: { x: 1 } })
  expect(res.statusCode).toBe(400)
})
