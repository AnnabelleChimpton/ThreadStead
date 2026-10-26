/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma mocks and handler stubs */
/**
 * Saves that change a page's look move Profile.pageUpdatedAt ("Recently
 * updated"), and "Share this update in the feed" writes a PageUpdate only
 * when it was ticked, the save worked and the page changed: at most one per
 * person per day (lib/domain/profile/page-updates.ts).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { Prisma } from '@prisma/client'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: { findFirst: jest.fn() },
    profile: {
      findUnique: jest.fn(),
      update: jest.fn(async ({ data }: any) => ({ customCSS: data.customCSS, cssMode: data.cssMode ?? 'inherit' })),
      upsert: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    pageUpdate: {
      upsert: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
    },
    pixelHomeVisitor: { deleteMany: jest.fn() },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({
  csrfProtection: jest.fn().mockResolvedValue(true),
  withCsrfProtection: (h: any) => h,
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  rateLimitCheck: jest.fn().mockResolvedValue(true),
  withRateLimit: () => (h: any) => h,
}))
jest.mock('@/lib/templates/compilation/template-cache', () => ({
  getCompiledTemplateWithMetrics: jest.fn().mockResolvedValue({
    ast: { type: 'root', children: [] },
    islands: [],
    staticHTML: '<p>hi</p>',
    warnings: [],
    strippedComponents: [],
  }),
  getCacheStats: jest.fn(),
}))
jest.mock('@/lib/templates/revisions/template-revisions', () => ({
  snapshotProfileBeforeSave: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/domain/users/capabilities', () => ({ requireAction: () => async () => ({ sub: 'u-pat' }) }))
jest.mock('@/lib/api/ringhub/ringhub-profile-sync', () => ({ notifyRingHubIfMember: jest.fn(async () => {}) }))
jest.mock('@/lib/pixel-homes/snapshot/service', () => ({ scheduleHomeSnapshot: jest.fn(async () => null) }))

import cssHandler from '@/pages/api/profile/[username]/css'
import templateHandler from '@/pages/api/profile/[username]/template'
import themeHandler from '@/pages/api/user/profile-template'
import updateHandler from '@/pages/api/profile/update'
import shareHandler from '@/pages/api/user/page-update'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { sharePageUpdate, changesPageLook, utcDay, SHARE_AFTER_SAVE_MS } from '@/lib/domain/profile/page-updates'

const mockDb = db as any
const OWNER = { id: 'u-pat', primaryHandle: 'pat@HomePageAgain', role: 'member' }
const SAVED = { id: 'p-pat', customTemplate: '<p>old</p>', customCSS: 'body { color: plum; }', cssMode: 'inherit', templateMode: 'advanced' }

function makeReqRes(body: Record<string, unknown>, method = 'POST') {
  const req = {
    method,
    query: { username: 'pat' },
    body,
    headers: {},
    cookies: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest
  const res: any = { statusCode: 200, body: undefined, headers: {} }
  res.status = (code: number) => { res.statusCode = code; return res }
  res.json = (data: unknown) => { res.body = data; return res }
  res.setHeader = (k: string, v: unknown) => { res.headers[k] = v; return res }
  res.end = () => res
  return { req, res: res as NextApiResponse & { statusCode: number; body: any } }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getSessionUser as jest.Mock).mockResolvedValue(OWNER)
  mockDb.handle.findFirst.mockResolvedValue({
    handle: 'pat',
    user: { id: OWNER.id, primaryHandle: OWNER.primaryHandle, profile: { ...SAVED } },
  })
  mockDb.profile.findUnique.mockResolvedValue({ ...SAVED, visibility: 'public' })
})

describe('CSS save', () => {
  test('ticked and changed: saved, marked updated, and shared once', async () => {
    const { req, res } = makeReqRes({ customCSS: 'body { color: teal; }', shareToFeed: true })
    await cssHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ shared: true, pageChanged: true })
    expect(mockDb.profile.update.mock.calls[0][0].data.pageUpdatedAt).toBeInstanceOf(Date)
    expect(mockDb.pageUpdate.upsert).toHaveBeenCalledTimes(1)
    expect(mockDb.pageUpdate.upsert.mock.calls[0][0].where.userId_day.userId).toBe(OWNER.id)
    // the item is written after the save
    expect(mockDb.pageUpdate.upsert.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockDb.profile.update.mock.invocationCallOrder[0]
    )
  })

  test('not ticked: marked updated, nothing in the feed', async () => {
    const { req, res } = makeReqRes({ customCSS: 'body { color: teal; }' })
    await cssHandler(req, res)
    expect(res.body.shared).toBe(false)
    expect(mockDb.profile.update.mock.calls[0][0].data.pageUpdatedAt).toBeInstanceOf(Date)
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test('only a real true counts as ticked', async () => {
    const { req, res } = makeReqRes({ customCSS: 'body { color: teal; }', shareToFeed: 'true' })
    await cssHandler(req, res)
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test('ticked but nothing changed: not marked updated, not shared', async () => {
    const { req, res } = makeReqRes({ customCSS: `${SAVED.customCSS}\n`, cssMode: 'override', shareToFeed: true })
    await cssHandler(req, res)
    expect(res.body).toMatchObject({ shared: false, pageChanged: false })
    expect(mockDb.profile.update.mock.calls[0][0].data).not.toHaveProperty('pageUpdatedAt')
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test('a failed save shares nothing', async () => {
    mockDb.profile.update.mockRejectedValueOnce(new Error('db down'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { req, res } = makeReqRes({ customCSS: 'body { color: teal; }', shareToFeed: true })
    await cssHandler(req, res)
    spy.mockRestore()
    expect(res.statusCode).toBe(500)
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test("someone else's page: refused, nothing shared", async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u-sam', primaryHandle: 'sam@HomePageAgain', role: 'member' })
    const { req, res } = makeReqRes({ customCSS: 'body { color: teal; }', shareToFeed: true })
    await cssHandler(req, res)
    expect(res.statusCode).toBe(403)
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  // Every editor sends the CSS (empty to clear); left out, it was wiped
  test.each([[{ cssMode: 'disable' }], [{ customCSS: { not: 'css' } }]])('%j: a 400, and the CSS is kept', async (body) => {
    const { req, res } = makeReqRes(body)
    await cssHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(mockDb.profile.update).not.toHaveBeenCalled()
  })

  test('an empty CSS still clears it', async () => {
    const { req, res } = makeReqRes({ customCSS: '' })
    await cssHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(mockDb.profile.update.mock.calls[0][0].data.customCSS).toBe('')
  })
})

describe('HTML save', () => {
  test('ticked and changed: marked updated and shared', async () => {
    const { req, res } = makeReqRes({ template: '<p>new</p>', shareToFeed: true })
    await templateHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ shared: true, pageChanged: true })
    const saved = mockDb.profile.upsert.mock.calls[0][0]
    expect(saved.update.pageUpdatedAt).toBeInstanceOf(Date)
    expect(saved.create.pageUpdatedAt).toBeInstanceOf(Date)
    expect(mockDb.pageUpdate.upsert).toHaveBeenCalledTimes(1)
  })

  test('not ticked: nothing in the feed', async () => {
    const { req, res } = makeReqRes({ template: '<p>new</p>' })
    await templateHandler(req, res)
    expect(res.body.shared).toBe(false)
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test('the same page again: not an update, not shared', async () => {
    const { req, res } = makeReqRes({ template: '<p>old</p>', customCSS: SAVED.customCSS, shareToFeed: true })
    await templateHandler(req, res)
    expect(res.body).toMatchObject({ shared: false, pageChanged: false })
    expect(mockDb.profile.upsert.mock.calls[0][0].update).not.toHaveProperty('pageUpdatedAt')
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test('the first save of a brand-new page counts', async () => {
    mockDb.profile.findUnique.mockResolvedValue(null)
    const { req, res } = makeReqRes({ template: '<p>hello</p>', shareToFeed: true })
    await templateHandler(req, res)
    expect(res.body.shared).toBe(true)
  })

  test('removing the HTML is an update by the owner', async () => {
    const { req, res } = makeReqRes({}, 'DELETE')
    await templateHandler(req, res)
    expect(mockDb.profile.updateMany.mock.calls[0][0].data.pageUpdatedAt).toBeInstanceOf(Date)
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })
})

describe('Settings > Your page themes and the layout switch', () => {
  test('a new theme marks the page updated; the same one again does not', async () => {
    const theme = makeReqRes({ template: 'pixel-petals' })
    await themeHandler(theme.req, theme.res)
    expect(mockDb.profile.upsert.mock.calls[0][0].update.pageUpdatedAt).toBeInstanceOf(Date)

    const written = mockDb.profile.upsert.mock.calls[0][0].update
    mockDb.profile.findUnique.mockResolvedValue({ ...SAVED, customCSS: written.customCSS, templateMode: 'enhanced' })
    const again = makeReqRes({ template: 'pixel-petals' })
    await themeHandler(again.req, again.res)
    expect(mockDb.profile.upsert.mock.calls[1][0].update).not.toHaveProperty('pageUpdatedAt')
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test('switching layout marks the page updated; a bio edit does not', async () => {
    const layout = makeReqRes({ templateMode: 'enhanced', cap: 'cap' })
    await updateHandler(layout.req, layout.res)
    expect(mockDb.profile.upsert.mock.calls[0][0].update.pageUpdatedAt).toBeInstanceOf(Date)

    const bio = makeReqRes({ bio: 'hello', templateMode: 'advanced', cap: 'cap' })
    await updateHandler(bio.req, bio.res)
    expect(mockDb.profile.upsert.mock.calls[1][0].update).not.toHaveProperty('pageUpdatedAt')
  })
})

describe('one per person per day', () => {
  test('two shares the same UTC day use the same row and move its time', async () => {
    const morning = new Date(Date.UTC(2026, 9, 19, 0, 5))
    const night = new Date(Date.UTC(2026, 9, 19, 23, 55))
    await sharePageUpdate('u-pat', morning)
    await sharePageUpdate('u-pat', night)
    const [first, second] = mockDb.pageUpdate.upsert.mock.calls.map((c: any) => c[0])
    expect(first.where).toEqual(second.where)
    expect(first.where.userId_day.day).toEqual(new Date(Date.UTC(2026, 9, 19)))
    expect(second.update).toEqual({ sharedAt: night })
  })

  test('the next day is a new item', async () => {
    await sharePageUpdate('u-pat', new Date(Date.UTC(2026, 9, 19, 23, 59)))
    await sharePageUpdate('u-pat', new Date(Date.UTC(2026, 9, 20, 0, 1)))
    const [a, b] = mockDb.pageUpdate.upsert.mock.calls.map((c: any) => c[0].where.userId_day.day)
    expect(a).not.toEqual(b)
  })

  test('two shares racing: the loser moves the winner’s time', async () => {
    mockDb.pageUpdate.upsert.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'x' })
    )
    const now = new Date(Date.UTC(2026, 9, 19, 12))
    expect(await sharePageUpdate('u-pat', now)).toBe(true)
    expect(mockDb.pageUpdate.update).toHaveBeenCalledWith({
      where: { userId_day: { userId: 'u-pat', day: utcDay(now) } },
      data: { sharedAt: now },
    })
  })

  test('a failure never throws into the save', async () => {
    mockDb.pageUpdate.upsert.mockRejectedValueOnce(new Error('db down'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sharePageUpdate('u-pat')).resolves.toBe(false)
    spy.mockRestore()
  })
})

describe("the HTML editor's follow-up share", () => {
  test('shares when the page changed a moment ago', async () => {
    mockDb.profile.findUnique.mockResolvedValue({ pageUpdatedAt: new Date(Date.now() - 60_000) })
    const { req, res } = makeReqRes({})
    await shareHandler(req, res)
    expect(res.body).toEqual({ shared: true })
    expect(mockDb.pageUpdate.upsert.mock.calls[0][0].where.userId_day.userId).toBe(OWNER.id)
  })

  test('nothing to share when the page has not changed lately', async () => {
    for (const pageUpdatedAt of [null, new Date(Date.now() - SHARE_AFTER_SAVE_MS - 60_000)]) {
      mockDb.profile.findUnique.mockResolvedValue({ pageUpdatedAt })
      const { req, res } = makeReqRes({})
      await shareHandler(req, res)
      expect(res.body).toEqual({ shared: false })
    }
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })

  test('signed out: refused', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes({})
    await shareHandler(req, res)
    expect(res.statusCode).toBe(401)
    expect(mockDb.pageUpdate.upsert).not.toHaveBeenCalled()
  })
})

describe('changesPageLook', () => {
  test('values that mean the same thing are not a change', () => {
    const before = { customTemplate: null, customCSS: 'a{}', cssMode: 'override', templateMode: 'default' }
    expect(changesPageLook(before, { customTemplate: '', customCSS: ' a{} ', cssMode: 'inherit', templateMode: 'enhanced' })).toBe(false)
    expect(changesPageLook(before, { cssMode: 'disable' })).toBe(true)
    expect(changesPageLook(before, { templateMode: 'advanced' })).toBe(true)
    expect(changesPageLook(null, { customCSS: '' })).toBe(false)
    expect(changesPageLook(null, { customCSS: 'b{}' })).toBe(true)
  })
})
