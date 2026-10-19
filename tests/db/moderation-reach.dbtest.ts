/**
 * The places a suspended or banned account used to still show, against a
 * real Postgres: lounge history, DMs, and the Indie Index (its sites' tier
 * and the owner shown on them). The rest of moderation is in
 * moderation.dbtest.ts; hub ring memberships on delete are in
 * lib/domain/users/__tests__/account-removal.test.ts and the federation suite.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/server/http/rate-limit', () => ({
  rateLimitCheck: jest.fn(async () => true),
  withRateLimit: () => (handler: any) => handler,
}))
jest.mock('@/lib/server/http/csrf', () => ({
  csrfProtection: jest.fn(async () => true),
  withCsrfProtection: (handler: any) => handler,
  createCsrfCookie: () => 'csrf=x',
  generateCsrfToken: () => 'x',
  getCookieSecureFlag: () => '',
}))

import { createSession } from '@/lib/auth/server'
import { moderateUser } from '@/lib/domain/users/moderation'
import { browseIndie } from '@/lib/search/indie'
import roomMessagesRoute from '@/pages/api/chat/rooms/[roomId]/messages'
import conversationsRoute from '@/pages/api/messages/conversations'
import conversationRoute from '@/pages/api/messages/[conversationId]'

const DAY = 24 * 60 * 60 * 1000
let seq = 0

async function person(handle: string, role: 'member' | 'admin' = 'member') {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      role,
      primaryHandle: `${handle}@${SITE_NAME}`,
      // old enough to count in the Indie Index
      createdAt: new Date(Date.now() - 30 * DAY),
      handles: { create: { handle, host: SITE_NAME } },
      profile: { create: { displayName: handle, visibility: 'public' } },
    },
  })
  return id
}

async function signIn(userId: string): Promise<string> {
  const res: any = { headers: {} as Record<string, unknown>, setHeader(k: string, v: unknown) { this.headers[k] = v } }
  await createSession(res, userId)
  return (res.headers['Set-Cookie'] as string[])[0].split(';')[0]
}

async function call(handler: any, { query = {}, cookie }: { query?: Record<string, string>; cookie?: string } = {}) {
  const req = { method: 'GET', query, headers: cookie ? { cookie } : {}, cookies: {}, url: '/test' } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headersSent: false,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; this.headersSent = true; return this },
    setHeader() { return this },
    end() { this.headersSent = true; return this },
  }
  await handler(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

let ADMIN: string, SPAMMER: string, NEIGHBOR: string, FRIEND: string

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "ModerationAction", "ChatRoom", "Conversation", "Site" RESTART IDENTITY CASCADE')
  ADMIN = await person('admin', 'admin')
  SPAMMER = await person('spammer')
  NEIGHBOR = await person('neighbor')
  FRIEND = await person('friend')
})

afterAll(() => db.$disconnect())

const ban = (userId: string) => moderateUser({ action: 'ban', reason: 'spam' }, { actorId: ADMIN, userId })
const lift = (userId: string) => moderateUser({ action: 'lift' }, { actorId: ADMIN, userId })

// ----------------------------------------------------------------- chat --

describe('lounge history', () => {
  beforeEach(async () => {
    await db.chatRoom.create({ data: { id: 'lounge', name: 'Lounge' } })
    const at = (min: number) => new Date(Date.now() - (60 - min) * 60 * 1000)
    await db.chatMessage.createMany({
      data: [
        { roomId: 'lounge', userId: NEIGHBOR, body: 'hello', createdAt: at(1) },
        { roomId: 'lounge', userId: SPAMMER, body: 'buy essays', createdAt: at(2) },
        { roomId: 'lounge', userId: FRIEND, body: 'hi neighbor', createdAt: at(3) },
      ],
    })
  })
  const bodies = (res: { body: any }) => res.body.messages.map((m: any) => m.body)

  it("leaves out a banned account's messages for everyone, signed in or not, until the ban is lifted", async () => {
    expect(bodies(await call(roomMessagesRoute, { query: { roomId: 'lounge' } }))).toEqual(['hello', 'buy essays', 'hi neighbor'])

    await ban(SPAMMER)
    expect(bodies(await call(roomMessagesRoute, { query: { roomId: 'lounge' } }))).toEqual(['hello', 'hi neighbor'])
    const cookie = await signIn(NEIGHBOR)
    expect(bodies(await call(roomMessagesRoute, { query: { roomId: 'lounge' }, cookie }))).toEqual(['hello', 'hi neighbor'])

    await lift(SPAMMER)
    expect(bodies(await call(roomMessagesRoute, { query: { roomId: 'lounge' } }))).toEqual(['hello', 'buy essays', 'hi neighbor'])
  })

  it('also leaves out people the viewer blocked, and pages by what is left', async () => {
    await db.userBlock.create({ data: { blockerId: NEIGHBOR, blockedUserId: FRIEND } })
    const cookie = await signIn(NEIGHBOR)

    const first = await call(roomMessagesRoute, { query: { roomId: 'lounge', limit: '1' }, cookie })
    expect(bodies(first)).toEqual(['buy essays'])
    expect(first.body.hasMore).toBe(true)
    const older = await call(roomMessagesRoute, { query: { roomId: 'lounge', limit: '1', before: first.body.messages[0].id }, cookie })
    expect(bodies(older)).toEqual(['hello'])

    // Signed out, the block isn't anyone's
    expect(bodies(await call(roomMessagesRoute, { query: { roomId: 'lounge' } }))).toHaveLength(3)
  })
})

describe('direct messages', () => {
  async function dm(a: string, b: string, lines: Array<[string, string]>) {
    const conversation = await db.conversation.create({
      data: { participants: { create: [{ userId: a }, { userId: b }] } },
    })
    const start = Date.now() - 60 * 1000
    for (const [i, [senderId, body]] of lines.entries()) {
      await db.directMessage.create({ data: { conversationId: conversation.id, senderId, body, createdAt: new Date(start + i * 1000) } })
    }
    return conversation.id
  }

  it("a banned account's conversations leave the list, and its messages leave the thread, until lifted", async () => {
    const withSpammer = await dm(NEIGHBOR, SPAMMER, [[SPAMMER, 'cheap essays'], [NEIGHBOR, 'no thanks']])
    const withFriend = await dm(NEIGHBOR, FRIEND, [[FRIEND, 'tea later?']])
    const cookie = await signIn(NEIGHBOR)
    const list = async () => (await call(conversationsRoute, { cookie })).body.map((c: any) => c.id).sort()
    const thread = async (id: string) =>
      (await call(conversationRoute, { query: { conversationId: id }, cookie })).body.map((m: any) => m.body)

    expect(await list()).toEqual([withSpammer, withFriend].sort())

    await ban(SPAMMER)
    expect(await list()).toEqual([withFriend])
    expect(await thread(withSpammer)).toEqual(['no thanks'])
    expect(await thread(withFriend)).toEqual(['tea later?'])

    await lift(SPAMMER)
    expect(await list()).toEqual([withSpammer, withFriend].sort())
    expect(await thread(withSpammer)).toEqual(['cheap essays', 'no thanks'])
  })
})

// --------------------------------------------------------- indie index --

describe('Indie Index', () => {
  async function ownSite(key: string, ownerId: string) {
    const site = await db.site.create({ data: { key, host: key, url: `https://${key}/`, title: key, ownerId } })
    await db.siteSignal.create({ data: { siteId: site.id, userId: ownerId, kind: 'own' } })
    return site
  }
  const tier = async (id: string) => (await db.site.findUniqueOrThrow({ where: { id }, select: { tier: true } })).tier
  const listed = async () => Object.fromEntries((await browseIndie()).results.map((s) => [s.key, s.owner?.handle ?? null]))

  it("a ban drops the account's own site out right away, and the lift brings it back", async () => {
    const spam = await ownSite('essays.example', SPAMMER)
    await ownSite('neighbor.example', NEIGHBOR)
    await db.site.updateMany({ data: { tier: 'resident' } }) // as the nightly run left them
    expect(await listed()).toEqual({ 'essays.example': 'spammer', 'neighbor.example': 'neighbor' })

    await ban(SPAMMER)
    expect(await tier(spam.id)).toBe('candidate')
    expect(await listed()).toEqual({ 'neighbor.example': 'neighbor' })

    await lift(SPAMMER)
    expect(await tier(spam.id)).toBe('resident')
    expect(await listed()).toEqual({ 'essays.example': 'spammer', 'neighbor.example': 'neighbor' })
  })

  it("a site other residents vouched for stays listed, without the banned owner's name on it", async () => {
    const site = await ownSite('shared.example', SPAMMER)
    await db.vouch.createMany({ data: [{ siteId: site.id, userId: NEIGHBOR }, { siteId: site.id, userId: FRIEND }] })

    await ban(SPAMMER)

    expect(await tier(site.id)).toBe('vouched')
    expect(await listed()).toEqual({ 'shared.example': null })
    const [result] = (await browseIndie()).results
    expect(result).toMatchObject({ vouchCount: 2, residentSignals: 2 })
  })
})
