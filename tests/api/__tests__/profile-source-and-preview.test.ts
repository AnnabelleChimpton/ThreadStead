/**
 * Phase 0 of the profile-editing plan (design/profile-editing-audit/PLAN.md):
 *  - GET /api/profile/[username] gives other viewers an explicit list of
 *    fields. The raw template source is the owner's, shown to others only
 *    when they share it (showTemplateSource).
 *  - POST /api/templates/compile is the editor's live preview and problems
 *    panel: it compiles and never writes. The old preview route stored every
 *    preview as the live page, so half-typed templates went public mid-edit.
 *  - Source saves have a size cap with a plain message.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    profile: { update: jest.fn(), upsert: jest.fn() },
    media: { findUnique: jest.fn() },
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
jest.mock('@/lib/domain/users/profile-access', () => ({
  residentAccess: jest.fn().mockResolvedValue({ visible: true }),
  hasPixelHome: jest.fn().mockResolvedValue(false),
}))
jest.mock('@/lib/templates/compilation/compile-pipeline', () => ({
  compileTemplateToArtifacts: jest.fn(() => ({
    ast: { type: 'root', children: [] },
    staticHTML: '<p>draft</p>',
    islands: [],
    warnings: [],
    strippedComponents: [],
  })),
  TemplateCompilationError: class extends Error {
    constructor(public errors: string[], public warnings: string[] = []) {
      super(errors[0])
    }
  },
}))

import profileHandler from '@/pages/api/profile/[username]'
import compileHandler from '@/pages/api/templates/compile'
import { compileTemplateToArtifacts, TemplateCompilationError } from '@/lib/templates/compilation/compile-pipeline'
import templateSaveHandler from '@/pages/api/profile/[username]/template'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { MAX_CSS_CHARS, MAX_TEMPLATE_CHARS } from '@/lib/templates/limits'

const mockDb = db as any
const OWNER = { id: 'u-pat', primaryHandle: 'pat@HomePageAgain', role: 'member' }
const STRANGER = { id: 'u-sam', primaryHandle: 'sam@HomePageAgain', role: 'member' }

const PROFILE = {
  id: 'p-pat',
  userId: 'u-pat',
  displayName: 'Pat',
  bio: 'hi',
  visibility: 'public',
  customCSS: 'body { color: plum; }',
  customTemplate: '<h1>my secret draft notes</h1>',
  customTemplateAst: '{"mode":"advanced"}',
  compiledTemplate: { staticHTML: '<h1>hi</h1>' },
  templateIslands: [],
  templateMode: 'advanced',
  templateEnabled: true,
  showTemplateSource: false,
  showInVisitorTrails: true,
  profileMidiId: null,
}

function makeReqRes(method: string, query: Record<string, string>, body?: unknown) {
  const req = { method, query, body, headers: {}, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
  const res: any = { statusCode: 200, body: undefined, headers: {} }
  res.status = (code: number) => { res.statusCode = code; return res }
  res.json = (data: unknown) => { res.body = data; return res }
  res.setHeader = (k: string, v: unknown) => { res.headers[k] = v; return res }
  res.end = () => res
  return { req, res: res as NextApiResponse & { statusCode: number; body: any } }
}

function profileRow(overrides: Record<string, unknown> = {}) {
  return { handle: 'pat', user: { id: 'u-pat', did: 'did:key:pat', primaryHandle: 'pat@HomePageAgain', installs: [], profile: { ...PROFILE, ...overrides } } }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/profile/[username]', () => {
  test("someone else gets the page's public fields, not its raw template", async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(STRANGER)
    mockDb.handle.findFirst.mockResolvedValue(profileRow())
    const { req, res } = makeReqRes('GET', { username: 'pat' })
    await profileHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.profile).not.toHaveProperty('customTemplate')
    expect(res.body.profile).not.toHaveProperty('showInVisitorTrails')
    // What the page needs to draw itself is still there
    expect(res.body.profile).toMatchObject({ displayName: 'Pat', customCSS: 'body { color: plum; }', templateMode: 'advanced' })
    expect(res.body.profile.compiledTemplate).toEqual({ staticHTML: '<h1>hi</h1>' })
  })

  test('a signed-out visitor gets the same', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    mockDb.handle.findFirst.mockResolvedValue(profileRow())
    const { req, res } = makeReqRes('GET', { username: 'pat' })
    await profileHandler(req, res)
    expect(res.body.profile).not.toHaveProperty('customTemplate')
  })

  test('the raw template is shown to others when the owner shares their source', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(STRANGER)
    mockDb.handle.findFirst.mockResolvedValue(profileRow({ showTemplateSource: true }))
    const { req, res } = makeReqRes('GET', { username: 'pat' })
    await profileHandler(req, res)
    expect(res.body.profile.customTemplate).toBe('<h1>my secret draft notes</h1>')
  })

  test('the owner gets everything', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(OWNER)
    mockDb.handle.findFirst.mockResolvedValue(profileRow())
    const { req, res } = makeReqRes('GET', { username: 'pat' })
    await profileHandler(req, res)
    expect(res.body.profile).toMatchObject({ customTemplate: '<h1>my secret draft notes</h1>', showInVisitorTrails: true })
  })
})

describe('POST /api/templates/compile (the live preview and problems panel)', () => {
  beforeEach(() => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(OWNER)
  })

  test('compiles the draft and writes nothing', async () => {
    const { req, res } = makeReqRes('POST', {}, { template: '<p>draft</p>' })
    await compileHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.compiled.staticHTML).toBe('<p>draft</p>')
    expect(mockDb.profile.update).not.toHaveBeenCalled()
    expect(mockDb.profile.upsert).not.toHaveBeenCalled()
  })

  test('a template that does not compile comes back with every error', async () => {
    ;(compileTemplateToArtifacts as jest.Mock).mockImplementationOnce(() => {
      throw new TemplateCompilationError(['first problem', 'second problem'], ['a warning'])
    })
    const { req, res } = makeReqRes('POST', {}, { template: '<p>broken draft' })
    await compileHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({ success: false, errors: ['first problem', 'second problem'], warnings: ['a warning'] })
  })

  test('refuses a draft over the size cap', async () => {
    const { req, res } = makeReqRes('POST', {}, { template: 'x'.repeat(MAX_TEMPLATE_CHARS + 1) })
    await compileHandler(req, res)
    expect(res.statusCode).toBe(413)
  })

  test('needs you signed in', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes('POST', {}, { template: '<p>draft</p>' })
    await compileHandler(req, res)
    expect(res.statusCode).toBe(401)
    expect(compileTemplateToArtifacts).not.toHaveBeenCalled()
  })
})

describe('size caps on saves', () => {
  test('the template save refuses CSS over the cap, with a plain message, and saves nothing', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(OWNER)
    const { req, res } = makeReqRes('POST', { username: 'pat' }, { template: '<p>hi</p>', customCSS: 'a'.repeat(MAX_CSS_CHARS + 1) })
    await templateSaveHandler(req, res)
    expect(res.statusCode).toBe(413)
    expect(res.body.error).toBe('Your CSS is over 200 KB. Trim it and save again.')
    expect(mockDb.profile.upsert).not.toHaveBeenCalled()
  })
})
