/**
 * @jest-environment node
 *
 * "Load default template" gives a fresh default layout, but must never clear
 * the person's saved CSS. It used to hard-code an empty stylesheet, so one
 * save in the template editor silently replaced their theme.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: { findFirst: jest.fn() },
    // the rate limiter's one upsert
    $queryRaw: jest.fn().mockResolvedValue([{ requestCount: 1, windowStartMs: Date.now() }]),
  },
}))
jest.mock('@/lib/auth/server', () => ({
  ...jest.requireActual('@/lib/auth/server'),
  getSessionUser: jest.fn(),
}))

import defaultTemplateRoute from '@/pages/api/profile/[username]/template/default'
import { generateDefaultProfileTemplate } from '@/lib/templates/default-profile-template'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'

const mockDb = db as any
const mockGetSessionUser = getSessionUser as jest.Mock

const THEME = '/* Charcoal Nights */\n.ts-profile-header {\n  background: #1a1816;\n}\n'

function ownerWith(profile: { customCSS: string | null; cssMode: string } | null) {
  mockGetSessionUser.mockResolvedValue({ id: 'u1', role: 'member', primaryHandle: 'pel@HomePageAgain' })
  mockDb.handle.findFirst.mockResolvedValue({
    handle: 'pel',
    user: { id: 'u1', primaryHandle: 'pel@HomePageAgain', profile },
  })
}

async function get(username = 'pel') {
  const req = {
    method: 'GET',
    query: { username },
    url: `/api/profile/${username}/template/default`,
    headers: { cookie: 'retro_session=u1.secret' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.jsonBody = payload
      this.headersSent = true
      return this
    },
    setHeader: jest.fn(),
  }
  await defaultTemplateRoute(req, res as NextApiResponse)
  return res as { statusCode: number; jsonBody: any }
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/profile/[username]/template/default', () => {
  it('returns the saved CSS exactly as saved', async () => {
    ownerWith({ customCSS: THEME, cssMode: 'inherit' })
    const res = await get()
    expect(res.statusCode).toBe(200)
    expect(res.jsonBody.css).toBe(THEME)
    expect(res.jsonBody.template).toContain('<ProfileHeader')
  })

  it('keeps the saved site-styles mode', async () => {
    ownerWith({ customCSS: THEME, cssMode: 'disable' })
    const res = await get()
    expect(res.jsonBody.css).toBe(THEME)
    expect(res.jsonBody.cssMode).toBe('disable')
  })

  it('goes by the saved mode, not an old mode comment in the CSS', async () => {
    const legacy = `/* CSS_MODE:disable */\n${THEME}`
    ownerWith({ customCSS: legacy, cssMode: 'inherit' })
    const res = await get()
    expect(res.jsonBody.css).toBe(legacy)
    expect(res.jsonBody.cssMode).toBe('inherit')
  })

  it('gives the starter comment only when there is no CSS yet', async () => {
    ownerWith({ customCSS: null, cssMode: 'inherit' })
    const res = await get()
    expect(res.jsonBody.css).toContain('Add your custom CSS below')
  })

  it("won't show someone else's CSS", async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'someone-else', role: 'member', primaryHandle: 'other@HomePageAgain' })
    mockDb.handle.findFirst.mockResolvedValue({
      handle: 'pel',
      user: { id: 'u1', primaryHandle: 'pel@HomePageAgain', profile: { customCSS: THEME, cssMode: 'inherit' } },
    })
    const res = await get()
    expect(res.statusCode).toBe(403)
    expect(JSON.stringify(res.jsonBody)).not.toContain('Charcoal')
  })
})

describe('generateDefaultProfileTemplate', () => {
  it.each(['inherit', 'override', 'disable'] as const)(
    'carries existing CSS over untouched in %s mode',
    (cssMode) => {
      expect(generateDefaultProfileTemplate({ customCSS: THEME, cssMode }).css).toBe(THEME)
    }
  )

  it('still gives an empty stylesheet its starter comment', () => {
    expect(generateDefaultProfileTemplate().css).toContain('Site-wide CSS will be inherited')
    expect(generateDefaultProfileTemplate({ cssMode: 'disable' }).css).toContain('body {')
  })
})
