/**
 * "Stopped by" (pixel homes Phase 5) against a real Postgres: who goes in a
 * home's visitor trail, who is only counted, and who the trail hides from
 * whom. Same setup as home-privacy.dbtest.ts.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
  isAdmin: (u: any) => u?.role === 'admin',
}))
jest.mock('@/lib/server/http/csrf', () => ({
  csrfProtection: jest.fn(async () => true),
  withCsrfProtection: (h: any) => h,
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  rateLimitCheck: jest.fn(async () => true),
  withRateLimit: () => (h: any) => h,
}))
// The capability is just the user's id here; minting is tested elsewhere.
jest.mock('@/lib/domain/users/capabilities', () => ({
  requireAction: () => async (cap: string) => ({ sub: cap }),
}))
jest.mock('@/lib/api/ringhub/ringhub-profile-sync', () => ({ notifyRingHubIfMember: jest.fn(async () => {}) }))
jest.mock('@/lib/pixel-homes/snapshot/service', () => ({ scheduleHomeSnapshot: jest.fn(async () => {}) }))

import visitorsHandler from '@/pages/api/home/[handle]/visitors'
import profileUpdateHandler from '@/pages/api/profile/update'
import { getSessionUser } from '@/lib/auth/server'
import { resetVisitMemory, utcDay } from '@/lib/pixel-homes/visit-count'

let seq = 0
async function person(handle: string, opts: { visibility?: Visibility | null; trails?: boolean } = {}) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      handles: { create: { handle, host: SITE_NAME } },
      ...(opts.visibility === null
        ? {}
        : {
            profile: {
              create: {
                displayName: handle,
                visibility: opts.visibility ?? 'public',
                ...(opts.trails === undefined ? {} : { showInVisitorTrails: opts.trails }),
              },
            },
          }),
    },
  })
  return id
}

async function call(viewer: string | null, method: 'GET' | 'POST', handle = 'home', headers: Record<string, string> = {}) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null)
  const req = {
    method,
    query: { handle },
    headers,
    cookies: {},
    socket: { remoteAddress: headers['x-test-ip'] ?? '203.0.113.9' },
  } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
    end() { return this },
  }
  await visitorsHandler(req, res as NextApiResponse)
  return res
}

const OWNER = 'u_home'
const trailNames = async (viewer: string | null) =>
  ((await call(viewer, 'GET')).body.visitors as Array<{ username: string }>).map((v) => v.username).sort()
const otherVisits = async () => (await call(null, 'GET')).body.otherVisits as number

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  resetVisitMemory()
  await person('home')
  await db.userHomeConfig.create({ data: { userId: OWNER } })
})
afterAll(() => db.$disconnect())

describe('recording a visit', () => {
  test('someone with trails on (the default) joins the trail and is not counted', async () => {
    await person('pal') // no showInVisitorTrails given: the column default
    const res = await call('u_pal', 'POST')
    expect(res.body.recorded).toBe('trail')
    expect(await trailNames(null)).toEqual(['pal'])
    expect(await otherVisits()).toBe(0)
  })

  test('someone with no profile row counts as trails on', async () => {
    await person('bare', { visibility: null })
    expect((await call('u_bare', 'POST')).body.recorded).toBe('trail')
    expect(await db.pixelHomeVisitor.count({ where: { homeOwnerId: OWNER } })).toBe(1)
  })

  test('someone with trails off is only counted, with no row about them', async () => {
    await person('quiet', { trails: false })
    const res = await call('u_quiet', 'POST')
    expect(res.body.recorded).toBe('count')
    expect(await db.pixelHomeVisitor.count()).toBe(0)
    expect(await otherVisits()).toBe(1)
  })

  test('a signed-out visit is counted, once a day per visitor, and nothing about them is stored', async () => {
    const a = { 'x-test-ip': '198.51.100.1', 'user-agent': 'Browser A' }
    const b = { 'x-test-ip': '198.51.100.2', 'user-agent': 'Browser A' }
    await call(null, 'POST', 'home', a)
    await call(null, 'POST', 'home', a)
    await call(null, 'POST', 'home', a)
    await call(null, 'POST', 'home', b)
    expect(await otherVisits()).toBe(2)

    const rows = await db.pixelHomeVisitCount.findMany()
    expect(rows).toEqual([{ homeOwnerId: OWNER, day: utcDay(new Date()), visits: 2 }])
    // The row has only the home, the day and a number: no IP, agent or digest anywhere
    expect(JSON.stringify(rows)).not.toMatch(/198\.51|Browser/)
  })

  test('the owner’s own visits are neither trailed nor counted', async () => {
    expect((await call(OWNER, 'POST')).body.recorded).toBe('none')
    expect(await db.pixelHomeVisitor.count()).toBe(0)
    expect(await db.pixelHomeVisitCount.count()).toBe(0)
  })

  test('a second visit later the same week moves the visitor up instead of failing', async () => {
    await person('pal')
    await call('u_pal', 'POST')
    await db.pixelHomeVisitor.updateMany({ data: { visitedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } })
    const res = await call('u_pal', 'POST')
    expect(res.statusCode).toBe(200)
    const rows = await db.pixelHomeVisitor.findMany()
    expect(rows).toHaveLength(1)
    expect(Date.now() - rows[0].visitedAt.getTime()).toBeLessThan(60_000)
  })

  test('counts older than the week are pruned and not shown', async () => {
    const old = new Date(utcDay(new Date()).getTime() - 7 * 24 * 60 * 60 * 1000)
    const inWeek = new Date(utcDay(new Date()).getTime() - 6 * 24 * 60 * 60 * 1000)
    await db.pixelHomeVisitCount.createMany({
      data: [
        { homeOwnerId: OWNER, day: old, visits: 40 },
        { homeOwnerId: OWNER, day: inWeek, visits: 3 },
      ],
    })
    expect(await otherVisits()).toBe(3)
    await call(null, 'POST')
    expect(await db.pixelHomeVisitCount.count({ where: { day: old } })).toBe(0)
  })

  test('a home that can’t be seen records nothing, signed in or out', async () => {
    await db.profile.update({ where: { userId: OWNER }, data: { visibility: 'private' } })
    await person('pal')
    expect((await call('u_pal', 'POST')).statusCode).toBe(403)
    expect((await call(null, 'POST')).statusCode).toBe(403)
    expect(await db.pixelHomeVisitor.count()).toBe(0)
    expect(await db.pixelHomeVisitCount.count()).toBe(0)
  })
})

describe('who the trail shows', () => {
  async function visited(handle: string, opts: Parameters<typeof person>[1] = {}) {
    const id = await person(handle, opts)
    await db.pixelHomeVisitor.create({ data: { homeOwnerId: OWNER, visitorId: id } })
    return id
  }

  test('a visitor who turns trails off leaves the trail at once', async () => {
    await visited('pal')
    expect(await trailNames(null)).toEqual(['pal'])
    await db.profile.update({ where: { userId: 'u_pal' }, data: { showInVisitorTrails: false } })
    expect(await trailNames(null)).toEqual([])
  })

  test('turning trails off in settings takes you out of every trail you were in', async () => {
    const pal = await visited('pal')
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: pal, role: 'member' })
    const res: any = { statusCode: 200, status(c: number) { this.statusCode = c; return this }, json() { return this }, setHeader() {} }
    await profileUpdateHandler(
      { method: 'POST', body: { showInVisitorTrails: false, cap: pal }, headers: {}, cookies: {} } as any,
      res
    )
    expect(res.statusCode).toBe(200)
    expect(await db.profile.findUnique({ where: { userId: pal } })).toMatchObject({ showInVisitorTrails: false })
    expect(await db.pixelHomeVisitor.count({ where: { visitorId: pal } })).toBe(0)
  })

  test('blocks either way between viewer and visitor hide the visitor from that viewer only', async () => {
    await visited('pal')
    await person('grump')
    await person('target')
    await db.userBlock.create({ data: { blockerId: 'u_grump', blockedUserId: 'u_pal' } })
    await db.userBlock.create({ data: { blockerId: 'u_pal', blockedUserId: 'u_target' } })
    expect(await trailNames('u_grump')).toEqual([])
    expect(await trailNames('u_target')).toEqual([])
    expect(await trailNames(null)).toEqual(['pal'])
  })

  test('blocks either way between owner and visitor hide the visitor from everyone', async () => {
    await visited('pal')
    await visited('ex')
    await db.userBlock.create({ data: { blockerId: OWNER, blockedUserId: 'u_pal' } })
    await db.userBlock.create({ data: { blockerId: 'u_ex', blockedUserId: OWNER } })
    expect(await trailNames(null)).toEqual([])
    expect(await trailNames(OWNER)).toEqual([])
  })

  test('a visitor’s own profile visibility decides who sees them in a trail', async () => {
    await visited('shy', { visibility: 'followers' })
    await person('fan')
    await db.follow.create({ data: { followerId: 'u_fan', followeeId: 'u_shy', status: 'accepted' } })
    expect(await trailNames(null)).toEqual([])
    expect(await trailNames(OWNER)).toEqual([])
    expect(await trailNames('u_fan')).toEqual(['shy'])
    expect(await trailNames('u_shy')).toEqual(['shy'])
  })

  test('visits older than a week drop out', async () => {
    await visited('pal')
    await db.pixelHomeVisitor.updateMany({ data: { visitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } })
    expect(await trailNames(null)).toEqual([])
  })
})
