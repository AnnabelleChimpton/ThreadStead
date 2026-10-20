/**
 * The template editor's save (POST /api/profile/[username]/template) stored
 * customCSS exactly as sent, while the CSS editor and settings saves ran it
 * through cleanCss. Every save path now stores sanitized CSS.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: { findFirst: jest.fn() },
    profile: { upsert: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue(null) },
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

import handler from '@/pages/api/profile/[username]/template'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'

const mockDb = db as any
const OWNER = { id: 'u-pat', primaryHandle: 'pat@HomePageAgain', role: 'member' }

function makeReqRes(body: Record<string, unknown>) {
  const req = {
    method: 'POST',
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
  mockDb.handle.findFirst.mockResolvedValue({ handle: 'pat', user: { id: OWNER.id, primaryHandle: OWNER.primaryHandle } })
})

test('stores the CSS sanitized, with no closing style tag in it', async () => {
  const { req, res } = makeReqRes({ template: '<p>hi</p>', customCSS: 'a{color:red}</style><b>x</b>' })
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  const saved = mockDb.profile.upsert.mock.calls[0][0]
  expect(saved.update.customCSS).not.toMatch(/<\/style/i)
  expect(saved.create.customCSS).not.toMatch(/<\/style/i)
  expect(saved.update.customCSS).toContain('a{color:red}')
})

test('drops a disallowed @import but keeps the rest of the stylesheet', async () => {
  const { req, res } = makeReqRes({
    template: '<p>hi</p>',
    customCSS: '@import url("https://example.com/x.css");\nbody { color: plum; }',
  })
  await handler(req, res)
  const saved = mockDb.profile.upsert.mock.calls[0][0]
  expect(saved.update.customCSS).not.toContain('@import')
  expect(saved.update.customCSS).toContain('body { color: plum; }')
})

test('leaves CSS alone when none is sent', async () => {
  const { req, res } = makeReqRes({ template: '<p>hi</p>' })
  await handler(req, res)
  const saved = mockDb.profile.upsert.mock.calls[0][0]
  expect(saved.update).not.toHaveProperty('customCSS')
})

test('refuses CSS that is not a string', async () => {
  const { req, res } = makeReqRes({ template: '<p>hi</p>', customCSS: { evil: true } })
  await handler(req, res)
  expect(res.statusCode).toBe(400)
  expect(mockDb.profile.upsert).not.toHaveBeenCalled()
})
