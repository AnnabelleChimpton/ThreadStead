/**
 * Inside and outside (design/pixel-homes-audit/PLAN.md, Phase 1): the
 * profile is the inside of the house, /home/<u> the outside.
 *
 * - /api/profile says whether the resident has a pixel home, only past the
 *   access check, and the profile page passes it on (it drives "Step back
 *   outside" and the header's "Pixel home").
 * - Quick view's "Pixel home" follows the same rule, with no preferPixelHome.
 * - GET /api/notifications says whose guestbook was signed, so the bell can
 *   open that guestbook at the entry.
 *
 * Access itself is the real residentAccess (lib/domain/users/profile-access)
 * against a mocked db; signed-out viewers need no follow or block lookups.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: { findFirst: jest.fn() },
    userHomeConfig: { findUnique: jest.fn() },
    media: { findUnique: jest.fn() },
    follow: { count: jest.fn(async () => 0), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    post: { count: jest.fn(async () => 0) },
    notification: { findMany: jest.fn() },
    guestbookEntry: { findMany: jest.fn() },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))

import profileHandler from '@/pages/api/profile/[username]'
import quickViewHandler from '@/pages/api/users/[username]/quick-view'
import notificationsHandler from '@/pages/api/notifications'
import { getServerSideProps as residentPageProps } from '@/pages/resident/[username]/index'
import { db } from '@/lib/config/database/connection'
import { getSessionUser } from '@/lib/auth/server'

const homes = new Set<string>()

function resident(handle: string, visibility: 'public' | 'private' = 'public') {
  return {
    handle,
    user: {
      id: `u_${handle}`,
      did: `did:test:${handle}`,
      primaryHandle: `${handle}@local`,
      profile: { displayName: handle, avatarUrl: null, visibility, bio: null, profileMidiId: null },
      installs: [],
      handles: [{ handle }],
    },
  }
}

async function call(handler: any, query: Record<string, string> = {}) {
  const req = { method: 'GET', query, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
  }
  await handler(req, res as NextApiResponse)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  homes.clear()
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  ;(db.handle.findFirst as jest.Mock).mockImplementation(async ({ where }: any) =>
    where.handle === 'shy' ? resident('shy', 'private') : resident(where.handle)
  )
  ;(db.userHomeConfig.findUnique as jest.Mock).mockImplementation(async ({ where }: any) =>
    homes.has(where.userId) ? { userId: where.userId } : null
  )
})

describe('/api/profile/[username]', () => {
  test('says hasPixelHome: true when the resident has a home', async () => {
    homes.add('u_pigeon')
    const res = await call(profileHandler, { username: 'pigeon' })
    expect(res.statusCode).toBe(200)
    expect(res.body.hasPixelHome).toBe(true)
  })

  test('says hasPixelHome: false when they have none', async () => {
    const res = await call(profileHandler, { username: 'pigeon' })
    expect(res.statusCode).toBe(200)
    expect(res.body.hasPixelHome).toBe(false)
  })

  test('a profile the viewer may not see says nothing about a home', async () => {
    homes.add('u_shy')
    const res = await call(profileHandler, { username: 'shy' })
    expect(res.statusCode).toBe(403)
    expect(res.body).not.toHaveProperty('hasPixelHome')
    expect(db.userHomeConfig.findUnique).not.toHaveBeenCalled()
  })
})

describe('/resident/[username] getServerSideProps', () => {
  const json = (status: number, body: any) => ({ ok: status < 400, status, json: async () => body }) as Response
  const ctx = { params: { username: 'pigeon' }, query: {}, req: { headers: {} } } as any

  function serveProfile(status: number, body: any) {
    global.fetch = jest.fn(async (url: string) =>
      url.includes('/api/site-config') ? json(200, { config: {} }) : json(status, body)
    ) as any
  }

  test('passes hasPixelHome on from the profile API', async () => {
    serveProfile(200, { userId: 'u_pigeon', username: 'pigeon', profile: {}, hasPixelHome: true })
    const result: any = await residentPageProps(ctx)
    expect(result.props.hasPixelHome).toBe(true)
  })

  test('no home, no link', async () => {
    serveProfile(200, { userId: 'u_pigeon', username: 'pigeon', profile: {}, hasPixelHome: false })
    const result: any = await residentPageProps(ctx)
    expect(result.props.hasPixelHome).toBe(false)
  })

  test('a private profile page never gets the link', async () => {
    serveProfile(403, { error: 'private_profile', visibility: 'private', username: 'pigeon' })
    const result: any = await residentPageProps(ctx)
    expect(result.props.isPrivateProfile).toBe(true)
    expect(result.props.hasPixelHome).toBeFalsy()
  })
})

describe('/api/users/[username]/quick-view', () => {
  test('hasPixelHome follows the home row; preferPixelHome is gone', async () => {
    homes.add('u_pigeon')
    const withHome = await call(quickViewHandler, { username: 'pigeon' })
    expect(withHome.body.data.hasPixelHome).toBe(true)
    expect(withHome.body.data).not.toHaveProperty('hasCustomPixelHome')
    expect((db.userHomeConfig.findUnique as jest.Mock).mock.calls[0][0].select).toEqual({ userId: true })

    homes.clear()
    const without = await call(quickViewHandler, { username: 'pigeon' })
    expect(without.body.data.hasPixelHome).toBe(false)
  })

  test('a profile the viewer may not see offers no home', async () => {
    homes.add('u_shy')
    const res = await call(quickViewHandler, { username: 'shy' })
    expect(res.body.data.hasPixelHome).toBe(false)
    expect(res.body.data.visibility).toBe('private')
  })
})

describe('GET /api/notifications', () => {
  test('guestbook rows say whose guestbook it is (the recipient’s)', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u_pigeon', role: 'member', primaryHandle: 'pigeon@local' })
    const actor = { id: 'u_pal', primaryHandle: 'pal@local', profile: { displayName: 'Pal', avatarUrl: null } }
    ;(db.notification.findMany as jest.Mock).mockResolvedValue([
      { id: 'n1', type: 'guestbook', status: 'unread', data: { guestbookEntryId: 'e1' }, createdAt: new Date(), readAt: null, actor },
      { id: 'n2', type: 'follow', status: 'unread', data: {}, createdAt: new Date(), readAt: null, actor },
    ])
    ;(db.guestbookEntry.findMany as jest.Mock).mockResolvedValue([{ id: 'e1', message: 'Hi there' }])

    const res = await call(notificationsHandler)
    const [guestbook, follow] = res.body.notifications
    expect(guestbook.data).toEqual({ guestbookEntryId: 'e1', excerpt: 'Hi there', guestbookOwnerHandle: 'pigeon@local' })
    expect(follow.data).toEqual({})
  })
})
