/**
 * POST /api/profile/upload-banner saves a cropped banner for the signed-in
 * owner only (write:profile capability), and DELETE takes it off.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: { profile: { upsert: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) } },
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
jest.mock('@/lib/domain/users/capabilities', () => ({
  requireAction: () => async (cap: string) => {
    if (cap !== 'good-cap') throw new Error('bad cap')
    return { ok: true }
  },
}))
jest.mock('@/lib/storage/r2', () => ({ putObject: jest.fn(async ({ key }: { key: string }) => `/r2/${key}`) }))
jest.mock('@/lib/media/image', () => ({ renderBanner: jest.fn(async () => Buffer.from('jpeg')) }))
// Multer hands the route whatever file the test put on the request
jest.mock('multer', () => {
  const multer: any = () => ({
    single: () => (req: any, _res: any, cb: (err?: Error) => void) => {
      req.file = req.testFile
      req.body = req.testBody || {}
      cb()
    },
  })
  multer.memoryStorage = () => ({})
  return multer
})

import handler from '@/pages/api/profile/upload-banner'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { putObject } from '@/lib/storage/r2'

const mockDb = db as any

function call(method: string, opts: { file?: unknown; body?: unknown; query?: Record<string, string> } = {}) {
  const req = {
    method,
    query: opts.query || {},
    headers: {},
    cookies: {},
    socket: { remoteAddress: '127.0.0.1' },
    testFile: opts.file,
    testBody: opts.body,
  } as unknown as NextApiRequest
  const res: any = { statusCode: 200, body: undefined, headers: {} }
  res.status = (code: number) => { res.statusCode = code; return res }
  res.json = (data: unknown) => { res.body = data; return res }
  res.setHeader = (k: string, v: unknown) => { res.headers[k] = v; return res }
  res.end = () => res
  return { req, res: res as NextApiResponse & { statusCode: number; body: any } }
}

const PNG = { mimetype: 'image/png', buffer: Buffer.from('png') }

beforeEach(() => {
  jest.clearAllMocks()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u-banner-1', primaryHandle: 'pat@HomePageAgain', role: 'member' })
})

test('saves a banner for the owner', async () => {
  const { req, res } = call('POST', { file: PNG, body: { cap: 'good-cap' } })
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(putObject).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^profile-banners\/u-banner-1\//), contentType: 'image/jpeg' }))
  expect(mockDb.profile.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u-banner-1' } }))
  expect(res.body.bannerUrl).toMatch(/^\/r2\/profile-banners\//)
})

test('refuses without the capability, and saves nothing', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u-banner-2', primaryHandle: 'sam@HomePageAgain', role: 'member' })
  const { req, res } = call('POST', { file: PNG, body: { cap: 'stolen' } })
  await handler(req, res)
  expect(res.statusCode).toBe(403)
  expect(putObject).not.toHaveBeenCalled()
})

test('refuses a GIF or anything but JPEG, PNG and WebP', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u-banner-3', primaryHandle: 'kim@HomePageAgain', role: 'member' })
  const { req, res } = call('POST', { file: { mimetype: 'image/gif', buffer: Buffer.from('gif') }, body: { cap: 'good-cap' } })
  await handler(req, res)
  expect(res.statusCode).toBe(400)
  expect(putObject).not.toHaveBeenCalled()
})

test('DELETE takes the banner off', async () => {
  const { req, res } = call('DELETE', { query: { cap: 'good-cap' } })
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(mockDb.profile.update).toHaveBeenCalledWith({ where: { userId: 'u-banner-1' }, data: { bannerUrl: null } })
})
