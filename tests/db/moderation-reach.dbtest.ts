/**
 * The places a suspended or banned account used to still show, against a
 * real Postgres: lounge history, DMs, notifications, and the Indie Index (its
 * sites' tier and the owner shown on them); and what someone leaving hears
 * when they try to write. The rest of moderation is in
 * moderation.dbtest.ts; hub ring memberships on delete are in
 * lib/domain/users/__tests__/account-removal.test.ts and the federation suite.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

// withRateLimit stays real: it's what refuses a leaving resident's write on hand-written routes
jest.mock('@/lib/server/http/rate-limit', () => ({
  ...jest.requireActual('@/lib/server/http/rate-limit'),
  rateLimitCheck: jest.fn(async () => true),
}))
jest.mock('@/lib/server/http/csrf', () => ({
  ...jest.requireActual('@/lib/server/http/csrf'),
  csrfProtection: jest.fn(async () => true),
  withCsrfProtection: (handler: any) => handler,
  createCsrfCookie: () => 'csrf=x',
  generateCsrfToken: () => 'x',
  getCookieSecureFlag: () => '',
}))

import { createSession, getSessionUser } from '@/lib/auth/server'
import { mintCapability } from '@/lib/domain/users/capabilities'
import { finishDueLeaves, startLeaving, stayAfterAll } from '@/lib/domain/users/leaving'
import { moderateUser } from '@/lib/domain/users/moderation'
import { browseIndie } from '@/lib/search/indie'
import roomMessagesRoute from '@/pages/api/chat/rooms/[roomId]/messages'
import conversationsRoute from '@/pages/api/messages/conversations'
import conversationRoute from '@/pages/api/messages/[conversationId]'
import notificationsRoute from '@/pages/api/notifications'
import notificationCountRoute from '@/pages/api/notifications/count'
import guestbookStatusRoute from '@/pages/api/users/[username]/guestbook-status'
import capCommentsRoute from '@/pages/api/cap/comments/[postId]'
import commentsRoute from '@/pages/api/comments/[postId]'
import guestbookRoute from '@/pages/api/guestbook/[username]'
import bulletinRoute from '@/pages/api/bulletin'
import musicPreferencesRoute from '@/pages/api/user/music-preferences'
import ringForkRoute from '@/pages/api/threadrings/[slug]/fork'

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

async function call(
  handler: any,
  { method = 'GET', query = {}, body, cookie }: { method?: string; query?: Record<string, string>; body?: any; cookie?: string } = {}
) {
  const req = { method, query, body, headers: cookie ? { cookie } : {}, cookies: {}, url: '/test' } as unknown as NextApiRequest
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

// -------------------------------------------------------------- leaving --

describe('leaving (lib/domain/users/leaving.ts)', () => {
  beforeEach(async () => {
    await db.chatRoom.create({ data: { id: 'lounge', name: 'Lounge' } })
    await db.chatMessage.createMany({
      data: [
        { roomId: 'lounge', userId: NEIGHBOR, body: 'hello' },
        { roomId: 'lounge', userId: FRIEND, body: 'hi neighbor' },
      ],
    })
  })
  const bodies = async () => (await call(roomMessagesRoute, { query: { roomId: 'lounge' } })).body.messages.map((m: any) => m.body)

  it('hides them at once, keeps their sign-in so they can stay, and staying brings them back', async () => {
    const cookie = await signIn(NEIGHBOR)
    await startLeaving(NEIGHBOR, 'neighbor')

    expect(await bodies()).toEqual(['hi neighbor'])
    const req = { headers: { cookie } } as unknown as NextApiRequest
    expect(await getSessionUser(req)).toMatchObject({ id: NEIGHBOR })

    await stayAfterAll(NEIGHBOR)
    expect(await bodies()).toEqual(['hello', 'hi neighbor'])
  })

  it('deletes them once their time is up, with the notes they signed elsewhere, and holds their name', async () => {
    // A claimed decoration used to block any delete (ON DELETE RESTRICT); an email login token has no relation
    const decoration = await db.decorationItem.create({
      data: { itemId: `gnome-${seq++}`, name: 'Gnome', type: 'furniture', category: 'furniture', zone: 'front_yard' },
    })
    await db.userDecorationClaim.create({ data: { userId: NEIGHBOR, decorationId: decoration.id } })
    await db.emailLoginToken.create({
      data: { token: `t-${seq++}`, encryptedEmail: 'x', expiresAt: new Date(Date.now() + DAY), userId: NEIGHBOR },
    })
    await db.guestbookEntry.createMany({
      data: [
        { profileOwner: FRIEND, authorId: NEIGHBOR, message: 'lovely yard!' },
        { profileOwner: NEIGHBOR, authorId: FRIEND, message: 'hi!' },
        { profileOwner: FRIEND, authorId: ADMIN, message: 'welcome' },
      ],
    })
    const deletesAt = await startLeaving(NEIGHBOR, 'neighbor')

    expect(await finishDueLeaves(new Date(deletesAt.getTime() - 1000))).toEqual({ deleted: 0, waiting: 0 })
    expect(await finishDueLeaves(deletesAt)).toEqual({ deleted: 1, waiting: 0 })

    expect(await db.user.findUnique({ where: { id: NEIGHBOR } })).toBeNull()
    expect(await db.userDecorationClaim.count({ where: { userId: NEIGHBOR } })).toBe(0)
    expect(await db.emailLoginToken.count({ where: { userId: NEIGHBOR } })).toBe(0)
    expect((await db.guestbookEntry.findMany({ select: { message: true } })).map((e) => e.message)).toEqual(['welcome'])
    expect(await db.moderationAction.count()).toBe(0)
    const tombstone = await db.handleTombstone.findFirst({ where: { handle: 'neighbor' } })
    expect(tombstone).toMatchObject({ removedForAbuse: false })
    expect(tombstone?.expiresAt).not.toBeNull()
  })
})

describe('writing while leaving', () => {
  const leavingBody = (deletesAt: Date) => ({
    error: `Your account is set to be deleted on ${deletesAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}. If you'd like to stay, press Keep my account at the top of the page.`,
    code: 'account_leaving',
  })

  it('an ordinary write says the same, on apiHandler routes and hand-written ones, and reads still work', async () => {
    const cookie = await signIn(NEIGHBOR)
    const leaving = leavingBody(await startLeaving(NEIGHBOR, 'neighbor'))
    const bulletin = () =>
      call(bulletinRoute, { method: 'POST', body: { category: 'SHARING', text: 'tea on the porch' }, cookie })
    const saveSetting = () => call(musicPreferencesRoute, { method: 'POST', body: { autoplay: false }, cookie })
    const fork = () => call(ringForkRoute, { method: 'POST', query: { slug: 'no-such-ring' }, body: {}, cookie })

    expect(await bulletin()).toMatchObject({ statusCode: 403, body: leaving })
    expect(await saveSetting()).toMatchObject({ statusCode: 403, body: leaving })
    expect(await fork()).toMatchObject({ statusCode: 403, body: leaving })
    expect(await db.bulletin.count()).toBe(0)
    expect(await call(musicPreferencesRoute, { cookie })).toMatchObject({ statusCode: 200, body: { autoplay: true } })

    await stayAfterAll(NEIGHBOR)
    expect((await bulletin()).statusCode).toBe(201)
    expect(await saveSetting()).toMatchObject({ statusCode: 200, body: { autoplay: false } })
    expect(await fork()).toMatchObject({ statusCode: 400, body: { error: 'ThreadRing name is required' } })
  })

  it('a capability write says the account is set to be deleted and how to stay, not "not logged in"', async () => {
    await db.post.create({ data: { id: 'post_friend', authorId: FRIEND, title: 'tea', bodyText: 'tea', visibility: 'public' } })
    const cookie = await signIn(NEIGHBOR)
    // Minted just before they chose to leave: still good for a few minutes
    const commentCap = await mintCapability(NEIGHBOR, ['write:comment'], 'post:post_friend/comments')
    const guestbookCap = await mintCapability(NEIGHBOR, ['write:guestbook'], `user:${FRIEND}/guestbook`)
    const leaving = leavingBody(await startLeaving(NEIGHBOR, 'neighbor'))
    const mint = () => call(capCommentsRoute, { method: 'POST', query: { postId: 'post_friend' }, cookie })

    expect(await mint()).toMatchObject({ statusCode: 403, body: leaving })
    const comment = await call(commentsRoute, { method: 'POST', query: { postId: 'post_friend' }, body: { content: 'hi', cap: commentCap } })
    expect(comment).toMatchObject({ statusCode: 403, body: leaving })
    const sign = await call(guestbookRoute, { method: 'POST', query: { username: 'friend' }, body: { message: 'hi', cap: guestbookCap } })
    expect(sign).toMatchObject({ statusCode: 403, body: leaving })
    expect(await db.comment.count()).toBe(0)
    expect(await db.guestbookEntry.count()).toBe(0)

    await stayAfterAll(NEIGHBOR)
    expect((await mint()).statusCode).toBe(200)
  })
})

// -------------------------------------------------------- notifications --

describe('notifications', () => {
  const notify = (actorId: string, type: 'follow' | 'guestbook' = 'guestbook') =>
    db.notification.create({ data: { recipientId: NEIGHBOR, actorId, type, data: {} } })
  async function seen(cookie: string) {
    const list = await call(notificationsRoute, { cookie })
    const count = await call(notificationCountRoute, { cookie })
    const guestbook = await call(guestbookStatusRoute, { query: { username: 'neighbor' }, cookie })
    return {
      actors: list.body.notifications.map((n: any) => n.actor.id).sort(),
      count: count.body.count,
      guestbook: guestbook.body.unreadCount,
    }
  }

  it("leaves out a banned or leaving actor's, in the list and every count, and brings them back after", async () => {
    await notify(SPAMMER)
    await notify(FRIEND)
    const cookie = await signIn(NEIGHBOR)
    const everyone = { actors: [FRIEND, SPAMMER].sort(), count: 2, guestbook: 2 }
    const friendOnly = { actors: [FRIEND], count: 1, guestbook: 1 }
    expect(await seen(cookie)).toEqual(everyone)

    await ban(SPAMMER)
    expect(await seen(cookie)).toEqual(friendOnly)
    await lift(SPAMMER)
    expect(await seen(cookie)).toEqual(everyone)

    await startLeaving(SPAMMER, 'spammer')
    expect(await seen(cookie)).toEqual(friendOnly)
    await stayAfterAll(SPAMMER)
    expect(await seen(cookie)).toEqual(everyone)
  })

  it('leaves out people the reader blocked, like feeds and comments do, but not people who blocked the reader', async () => {
    await notify(SPAMMER, 'follow')
    await notify(FRIEND, 'follow')
    await db.userBlock.create({ data: { blockerId: NEIGHBOR, blockedUserId: SPAMMER } })
    await db.userBlock.create({ data: { blockerId: FRIEND, blockedUserId: NEIGHBOR } })
    expect(await seen(await signIn(NEIGHBOR))).toEqual({ actors: [FRIEND], count: 1, guestbook: 0 })
  })
})

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
