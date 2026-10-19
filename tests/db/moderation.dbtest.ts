/**
 * Suspend, ban and lift against a real Postgres (EXTERNAL_AUDIT_REVIEW S-3):
 * the state and audit rows, sessions ending, writes refused across routes
 * (session and capability-token routes), and the account dropping out of
 * every list while its own pages read as gone. Sessions are real cookies
 * through the real getSessionUser; only CSRF, rate limits and Ring Hub are
 * mocked. Hub cleanup on delete is in lib/domain/users/__tests__/account-removal.test.ts.
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
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  shouldUseRingHub: () => false,
  getPublicRingHubClient: () => null,
  getRingHubClient: () => null,
}))
jest.mock('@/lib/domain/notifications', () => ({
  createGuestbookNotification: jest.fn(),
  createCommentNotification: jest.fn(),
  createReplyNotification: jest.fn(),
  createMentionNotifications: jest.fn(),
}))

import { createSession, getSessionUser } from '@/lib/auth/server'
import { mintCapability } from '@/lib/domain/users/capabilities'
import { getRestrictedUserIds, isRestricted, moderateUser } from '@/lib/domain/users/moderation'
import { countNeighbors, residentAccess, visibleResidentWhere } from '@/lib/domain/users/profile-access'
import { getHiddenIds } from '@/lib/domain/users/blocks'
import { homeCandidates, postCandidates, userCandidates } from '@/lib/search/local'
import moderationRoute from '@/pages/api/admin/moderation'
import reportsRoute from '@/pages/api/admin/reports'
import deleteUserRoute from '@/pages/api/admin/delete-user'
import usersRoute from '@/pages/api/admin/users'
import meRoute from '@/pages/api/auth/me'
import bulletinRoute from '@/pages/api/bulletin/index'
import commentsRoute from '@/pages/api/comments/[postId]'
import guestbookRoute from '@/pages/api/guestbook/[username]'
import postDeleteRoute from '@/pages/api/posts/delete'
import directoryRoute from '@/pages/api/directory'
import profileRoute from '@/pages/api/profile/[username]'
import singlePostRoute from '@/pages/api/posts/single/[postId]'
import userPostsRoute from '@/pages/api/posts/[username]'
import recentFeedRoute from '@/pages/api/feed/recent'
import communityBulletinsRoute from '@/pages/api/community/bulletins'

// ------------------------------------------------------------- fixtures --

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
      handles: { create: { handle, host: SITE_NAME } },
      profile: { create: { displayName: handle, bio: `${handle} writes about essays` } },
      homeConfig: { create: { houseTitle: `${handle} essay house` } },
    },
  })
  await db.post.create({
    data: { id: `post_${handle}`, authorId: id, title: `${handle} essay help`, bodyText: 'essays', visibility: 'public' },
  })
  return id
}

/** A real Session row and the cookie header that carries it. */
async function signIn(userId: string): Promise<string> {
  const res: any = { headers: {} as Record<string, unknown>, setHeader(k: string, v: unknown) { this.headers[k] = v } }
  await createSession(res, userId)
  const cookie = (res.headers['Set-Cookie'] as string[])[0].split(';')[0]
  return cookie
}

async function call(
  handler: any,
  { method = 'GET', query = {}, body, cookie }: { method?: string; query?: Record<string, string>; body?: any; cookie?: string }
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

let adminCookie: string
let ADMIN: string, SPAMMER: string, NEIGHBOR: string

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await db.$executeRawUnsafe('TRUNCATE "ModerationAction" RESTART IDENTITY CASCADE')
  ADMIN = await person('admin', 'admin')
  SPAMMER = await person('spammer')
  NEIGHBOR = await person('neighbor')
  adminCookie = await signIn(ADMIN)
})

afterAll(() => db.$disconnect())

const suspend = (userId: string, days = 7, reason = 'cooling off') =>
  moderateUser({ action: 'suspend', until: new Date(Date.now() + days * DAY), reason }, { actorId: ADMIN, userId })
const ban = (userId: string, reason = 'spam') => moderateUser({ action: 'ban', reason }, { actorId: ADMIN, userId })
const lift = (userId: string) => moderateUser({ action: 'lift' }, { actorId: ADMIN, userId })

// ------------------------------------------------------- state + audit --

describe('suspend, ban and lift', () => {
  it('writes the state, who and when, and an audit row for each action', async () => {
    await suspend(SPAMMER, 3, 'rude in chat')
    let row = await db.user.findUniqueOrThrow({ where: { id: SPAMMER } })
    expect(row.moderationStatus).toBe('suspended')
    expect(row.suspendedUntil!.getTime()).toBeGreaterThan(Date.now() + 2 * DAY)
    expect(row.moderationReason).toBe('rude in chat')
    expect(row.moderatedById).toBe(ADMIN)
    expect(row.moderatedAt).toBeInstanceOf(Date)

    await ban(SPAMMER, 'spam')
    row = await db.user.findUniqueOrThrow({ where: { id: SPAMMER } })
    expect(row).toMatchObject({ moderationStatus: 'banned', suspendedUntil: null, moderationReason: 'spam' })

    await lift(SPAMMER)
    row = await db.user.findUniqueOrThrow({ where: { id: SPAMMER } })
    expect(row).toMatchObject({ moderationStatus: 'active', suspendedUntil: null, moderationReason: null })

    const log = await db.moderationAction.findMany({ where: { userId: SPAMMER }, orderBy: { createdAt: 'asc' } })
    expect(log.map((a) => [a.action, a.actorId, a.reason, a.userHandle])).toEqual([
      ['suspend', ADMIN, 'rude in chat', `spammer@${SITE_NAME}`],
      ['ban', ADMIN, 'spam', `spammer@${SITE_NAME}`],
      ['lift', ADMIN, null, `spammer@${SITE_NAME}`],
    ])
    expect(log[0].until).toEqual(log[0].until && expect.any(Date))
  })

  it('refuses what makes no sense', async () => {
    await expect(moderateUser({ action: 'ban', reason: '' }, { actorId: ADMIN, userId: SPAMMER })).rejects.toMatchObject({ status: 400 })
    await expect(
      moderateUser({ action: 'suspend', until: new Date(Date.now() - DAY), reason: 'x' }, { actorId: ADMIN, userId: SPAMMER })
    ).rejects.toMatchObject({ status: 400, message: 'Pick an end date in the future' })
    await expect(ban(ADMIN)).rejects.toMatchObject({ status: 400 }) // yourself
    const other = await person('otheradmin', 'admin')
    await expect(ban(other)).rejects.toMatchObject({ status: 400, message: "Admins can't be suspended or banned" })
    await expect(lift(SPAMMER)).rejects.toMatchObject({ status: 400 })
    await expect(ban('u_nobody')).rejects.toMatchObject({ status: 404 })
    expect(await db.moderationAction.count()).toBe(0)
  })

  it('a suspension ends by itself on its date', async () => {
    await suspend(SPAMMER)
    await db.user.update({ where: { id: SPAMMER }, data: { suspendedUntil: new Date(Date.now() - 1000) } })
    const row = await db.user.findUniqueOrThrow({ where: { id: SPAMMER } })
    expect(isRestricted(row)).toBe(false)
    expect(await getRestrictedUserIds()).toEqual([])
    const cookie = await signIn(SPAMMER) // sign-in works again
    expect(await getSessionUser({ headers: { cookie } })).toMatchObject({ id: SPAMMER })
  })
})

// ------------------------------------------------------------- sessions --

describe('sessions and sign-in', () => {
  it.each([['suspend'], ['ban']])('%s ends every session, and the cookie stops working', async (action) => {
    const cookie = await signIn(SPAMMER)
    await signIn(SPAMMER)
    expect(await getSessionUser({ headers: { cookie } })).toMatchObject({ id: SPAMMER })

    await (action === 'ban' ? ban(SPAMMER) : suspend(SPAMMER))

    expect(await db.session.count({ where: { userId: SPAMMER } })).toBe(0)
    expect(await getSessionUser({ headers: { cookie } })).toBeNull()
    expect((await call(meRoute, { cookie })).body).toEqual({ loggedIn: false })
    // other people stay signed in
    expect(await getSessionUser({ headers: { cookie: adminCookie } })).toMatchObject({ id: ADMIN })
  })

  it('a session made in between (a race) still reads as signed out', async () => {
    await ban(SPAMMER)
    await db.session.create({ data: { userId: SPAMMER, secret: 'raced', expiresAt: new Date(Date.now() + DAY) } })
    expect(await getSessionUser({ headers: { cookie: `retro_session=${SPAMMER}.raced` } })).toBeNull()
  })

  it('refuses to start a new session, with a plain message', async () => {
    await suspend(SPAMMER, 10)
    await expect(signIn(SPAMMER)).rejects.toMatchObject({ status: 403, message: expect.stringMatching(/^This account is suspended until \d+ \w+ \d{4}\.$/) })
    await ban(SPAMMER)
    await expect(signIn(SPAMMER)).rejects.toMatchObject({ status: 403, message: 'This account is banned.' })
    expect(await db.session.count({ where: { userId: SPAMMER } })).toBe(0)
  })
})

// ------------------------------------------------------- write-blocking --

describe("a suspended or banned account can't write", () => {
  it('session routes treat them as signed out', async () => {
    const cookie = await signIn(SPAMMER)
    await suspend(SPAMMER)
    const note = await call(bulletinRoute, { method: 'POST', cookie, body: { category: 'SHARING', text: 'buy essays' } })
    expect(note.statusCode).toBe(401)
    const del = await call(postDeleteRoute, { method: 'POST', cookie, body: { id: `post_spammer`, cap: 'x' } })
    expect(del.statusCode).toBe(401)
    expect(await db.bulletin.count()).toBe(0)
  })

  it('capability tokens minted before the action stop working (comments, guestbooks)', async () => {
    const commentCap = await mintCapability(SPAMMER, ['write:comment'], `post:post_neighbor/comments`)
    const guestbookCap = await mintCapability(SPAMMER, ['write:guestbook'], `user:${NEIGHBOR}/guestbook`)

    // works while active
    const before = await call(commentsRoute, { method: 'POST', query: { postId: 'post_neighbor' }, body: { content: 'hi', cap: commentCap } })
    expect(before.statusCode).toBe(201)

    await ban(SPAMMER)

    const comment = await call(commentsRoute, { method: 'POST', query: { postId: 'post_neighbor' }, body: { content: 'spam', cap: commentCap } })
    expect(comment.statusCode).toBe(401)
    const sign = await call(guestbookRoute, { method: 'POST', query: { username: 'neighbor' }, body: { message: 'spam', cap: guestbookCap } })
    expect(sign.statusCode).toBe(403)
    expect(await db.comment.count({ where: { authorId: SPAMMER } })).toBe(1)
    expect(await db.guestbookEntry.count({ where: { authorId: SPAMMER } })).toBe(0)
  })

  it('chat drops their open sockets', async () => {
    const kick = jest.fn()
    globalThis.__threadsteadChatDisconnectUser = kick
    await ban(SPAMMER)
    expect(kick).toHaveBeenCalledWith(SPAMMER)
    kick.mockClear()
    await lift(SPAMMER)
    expect(kick).not.toHaveBeenCalled()
    globalThis.__threadsteadChatDisconnectUser = undefined
  })
})

// --------------------------------------------------------------- hiding --

describe('they drop out of lists, and their pages read as gone', () => {
  const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id).sort()

  it.each([['suspend'], ['ban']])('%s: lists, search and feeds leave them out; lift brings them back', async (action) => {
    await db.comment.create({ data: { postId: 'post_neighbor', authorId: SPAMMER, content: 'buy essays' } })
    await db.bulletin.create({
      data: { userId: SPAMMER, category: 'SHARING', text: 'essays', expiresAt: new Date(Date.now() + DAY) },
    })
    const listed = async (viewer: string | null) => ({
      residents: ids(await db.user.findMany({ where: visibleResidentWhere(viewer), select: { id: true } })),
      directory: (await call(directoryRoute, { query: { limit: '50' } })).body.users.map((u: any) => u.id).sort(),
      neighbors: await countNeighbors(viewer),
      posts: ids(await postCandidates('essay', viewer)),
      people: ids(await userCandidates('spammer', viewer)),
      homes: ids(await homeCandidates('essay house', viewer)),
      feed: ((await call(recentFeedRoute, { query: { limit: '50' } })).body.posts as any[]).map((p) => p.id).sort(),
      comments: ((await call(commentsRoute, { query: { postId: 'post_neighbor' } })).body.comments as any[]).length,
      board: ((await call(bulletinRoute, {})).body.bulletins as any[]).length,
      ticker: ((await call(communityBulletinsRoute, {})).body.bulletins as any[]).length,
    })

    const before = await listed(null)
    expect(before.residents).toContain(SPAMMER)
    expect(before.directory).toContain(SPAMMER)
    expect(before.neighbors).toBe(3)
    expect(before.posts).toContain('post_spammer')
    expect(before.people).toContain(SPAMMER)
    expect(before.homes).toContain(SPAMMER)
    expect(before.feed).toContain('post_spammer')
    expect(before).toMatchObject({ comments: 1, board: 1, ticker: 1 })

    await (action === 'ban' ? ban(SPAMMER) : suspend(SPAMMER))

    for (const viewer of [null, NEIGHBOR, ADMIN]) {
      const after = await listed(viewer)
      expect(after.residents).not.toContain(SPAMMER)
      expect(after.directory).not.toContain(SPAMMER)
      expect(after.neighbors).toBe(2)
      expect(after.posts).not.toContain('post_spammer')
      expect(after.people).not.toContain(SPAMMER)
      expect(after.homes).not.toContain(SPAMMER)
      expect(after.feed).not.toContain('post_spammer')
      expect(after.feed).toContain('post_neighbor')
      expect(after).toMatchObject({ comments: 0, board: 0, ticker: 0 })
    }
    expect((await getHiddenIds(null)).blockedUserIds).toEqual([SPAMMER])

    await lift(SPAMMER)
    expect(await listed(null)).toEqual(before)
  })

  it('their profile, posts and home read as gone, the same for everyone (admins too)', async () => {
    await ban(SPAMMER)
    for (const cookie of [undefined, adminCookie]) {
      expect((await call(profileRoute, { query: { username: 'spammer' }, cookie })).statusCode).toBe(404)
      expect((await call(singlePostRoute, { query: { postId: 'post_spammer' }, cookie })).statusCode).toBe(404)
      expect((await call(userPostsRoute, { query: { username: 'spammer' }, cookie })).statusCode).toBe(404)
    }
    const access = await residentAccess({ id: ADMIN, role: 'admin' }, SPAMMER)
    expect(access).toEqual({ visible: false, visibility: 'private', blocked: false, suspended: true })
    // everyone else is untouched
    expect((await call(profileRoute, { query: { username: 'neighbor' } })).statusCode).toBe(200)
  })
})

// --------------------------------------------------------------- routes --

describe('admin routes', () => {
  it('POST /api/admin/moderation suspends, bans and lifts; GET shows the history', async () => {
    const until = new Date(Date.now() + 5 * DAY).toISOString().slice(0, 10)
    let res = await call(moderationRoute, { method: 'POST', cookie: adminCookie, body: { action: 'suspend', userId: SPAMMER, until, reason: 'cool off' } })
    expect(res.statusCode).toBe(200)
    expect(res.body.user).toMatchObject({ moderationStatus: 'suspended', handle: `spammer@${SITE_NAME}` })
    expect(new Date(res.body.user.suspendedUntil).toISOString()).toBe(`${until}T00:00:00.000Z`)

    res = await call(moderationRoute, { method: 'POST', cookie: adminCookie, body: { action: 'ban', userId: SPAMMER, reason: 'spam' } })
    expect(res.body.user.moderationStatus).toBe('banned')

    const users = await call(usersRoute, { cookie: adminCookie })
    expect(users.body.users.find((u: any) => u.id === SPAMMER)).toMatchObject({ moderationStatus: 'banned', moderationReason: 'spam' })

    res = await call(moderationRoute, { cookie: adminCookie, query: { userId: SPAMMER } })
    expect(res.body).toMatchObject({ posts: 1, ringPosts: 0, hasKey: false })
    expect(res.body.history.map((h: any) => h.action)).toEqual(['ban', 'suspend'])
    expect(res.body.history[0].actor).toEqual({ primaryHandle: `admin@${SITE_NAME}` })

    res = await call(moderationRoute, { method: 'POST', cookie: adminCookie, body: { action: 'lift', userId: SPAMMER } })
    expect(res.body.user.moderationStatus).toBe('active')
  })

  it('validates, and only admins get in', async () => {
    const bad = await call(moderationRoute, { method: 'POST', cookie: adminCookie, body: { action: 'suspend', userId: SPAMMER, until: 'soon', reason: 'x' } })
    expect(bad.statusCode).toBe(400)
    const noReason = await call(moderationRoute, { method: 'POST', cookie: adminCookie, body: { action: 'ban', userId: SPAMMER, reason: '  ' } })
    expect(noReason.body.error).toBe('Add a short reason')
    const member = await call(moderationRoute, { method: 'POST', cookie: await signIn(NEIGHBOR), body: { action: 'ban', userId: SPAMMER, reason: 'x' } })
    expect(member.statusCode).toBe(403)
    const signedOut = await call(moderationRoute, { method: 'POST', body: { action: 'ban', userId: SPAMMER, reason: 'x' } })
    expect(signedOut.statusCode).toBe(401)
    expect((await db.user.findUniqueOrThrow({ where: { id: SPAMMER } })).moderationStatus).toBe('active')
  })

  it('resolving a report can ban the reported account, and the report says so', async () => {
    const report = await db.userReport.create({
      data: { reporterId: NEIGHBOR, reportedUserId: SPAMMER, reportType: 'post', targetId: 'post_spammer', reason: 'spam' },
    })
    const res = await call(reportsRoute, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { reportId: report.id, moderation: { action: 'ban', reason: 'essay mill' } },
    })
    expect(res.statusCode).toBe(200)
    expect((await db.user.findUniqueOrThrow({ where: { id: SPAMMER } })).moderationStatus).toBe('banned')
    expect(await db.userReport.findUniqueOrThrow({ where: { id: report.id } })).toMatchObject({
      status: 'resolved',
      resolution: 'Banned: essay mill',
      reviewedBy: ADMIN,
    })
    expect(await db.moderationAction.findFirst({ where: { userId: SPAMMER } })).toMatchObject({ reportId: report.id })

    const listed = await call(reportsRoute, { cookie: adminCookie, query: { status: 'all' } })
    expect(listed.body.reports[0].reportedUser).toMatchObject({ id: SPAMMER, moderationStatus: 'banned' })
  })

  it("won't act on a report about someone else", async () => {
    const report = await db.userReport.create({
      data: { reporterId: ADMIN, reportedUserId: NEIGHBOR, reportType: 'user', targetId: NEIGHBOR, reason: 'spam' },
    })
    await expect(
      moderateUser({ action: 'ban', reason: 'x' }, { actorId: ADMIN, userId: SPAMMER, reportId: report.id })
    ).rejects.toMatchObject({ status: 400 })
    expect((await db.user.findUniqueOrThrow({ where: { id: SPAMMER } })).moderationStatus).toBe('active')
  })

  it('DELETE /api/admin/delete-user needs a ban first, then deletes and keeps the audit trail', async () => {
    const early = await call(deleteUserRoute, { method: 'DELETE', cookie: adminCookie, body: { userId: SPAMMER } })
    expect(early.statusCode).toBe(409)
    expect(early.body.error).toBe('Ban the account first. Deleting is the second step.')
    expect(await db.user.count({ where: { id: SPAMMER } })).toBe(1)

    await ban(SPAMMER, 'spam')
    const res = await call(deleteUserRoute, { method: 'DELETE', cookie: adminCookie, body: { userId: SPAMMER, reason: 'spam' } })
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ success: true, removed: 0, failed: [] })
    expect(await db.user.count({ where: { id: SPAMMER } })).toBe(0)
    expect(await db.post.count({ where: { authorId: SPAMMER } })).toBe(0)

    const log = await db.moderationAction.findMany({ orderBy: { createdAt: 'asc' } })
    expect(log.map((a) => [a.action, a.userId, a.userHandle])).toEqual([
      ['ban', null, `spammer@${SITE_NAME}`],
      ['delete', null, `spammer@${SITE_NAME}`],
    ])
  })
})
