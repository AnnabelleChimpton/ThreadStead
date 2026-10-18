/**
 * Route tests (mocked db) for /api/admin/site-css.
 *
 * No SiteConfig row serves the bundled theme; a saved empty string turns site
 * CSS off. The admin UI used to be able only to save, so "go back to the
 * default" meant saving an empty box, which switched the whole site to
 * unthemed base styles (production, 2026-10-17). DELETE removes the row.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    siteConfig: { findUnique: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/middleware/csrf', () => ({ csrfProtection: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/middleware/generalRateLimiting', () => ({
  rateLimitCheck: jest.fn().mockResolvedValue(true),
}))

import handler from '@/pages/api/admin/site-css'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getDefaultSiteCSS, getSiteCSSWithSource, invalidateSiteCSSCache } from '@/lib/utils/css/site-css-server'

const mockDb = db as any

function makeReqRes(method: string, body?: any) {
  const req = { method, query: {}, body, headers: {}, url: '/api/admin/site-css' } as unknown as NextApiRequest
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
      return this
    },
    setHeader: jest.fn(),
    end: jest.fn(),
  }
  return { req, res: res as NextApiResponse & { statusCode: number; jsonBody: any } }
}

beforeEach(() => {
  jest.clearAllMocks()
  invalidateSiteCSSCache()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'admin' })
})

test('the bundled default theme is readable', () => {
  expect(getDefaultSiteCSS()).toContain('Cozy Notebook')
})

describe('GET', () => {
  test('no saved row: returns the bundled theme with isDefault true', async () => {
    mockDb.siteConfig.findUnique.mockResolvedValue(null)
    const { req, res } = makeReqRes('GET')
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toEqual({ css: getDefaultSiteCSS(), isDefault: true })
  })

  test('saved CSS: returns it with isDefault false', async () => {
    mockDb.siteConfig.findUnique.mockResolvedValue({ key: 'site_custom_css', value: 'body{color:red}' })
    const { req, res } = makeReqRes('GET')
    await handler(req, res)
    expect(res.jsonBody).toEqual({ css: 'body{color:red}', isDefault: false })
  })

  test('saved empty value (theme off) is not the default', async () => {
    mockDb.siteConfig.findUnique.mockResolvedValue({ key: 'site_custom_css', value: '' })
    const { req, res } = makeReqRes('GET')
    await handler(req, res)
    expect(res.jsonBody).toEqual({ css: '', isDefault: false })
  })
})

describe('DELETE', () => {
  test('removes the row and reports the default theme', async () => {
    mockDb.siteConfig.deleteMany.mockResolvedValue({ count: 1 })
    const { req, res } = makeReqRes('DELETE')
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(mockDb.siteConfig.deleteMany).toHaveBeenCalledWith({ where: { key: 'site_custom_css' } })
    expect(res.jsonBody).toEqual({ success: true, css: getDefaultSiteCSS(), isDefault: true })
  })

  test('is fine when there is no row to remove', async () => {
    mockDb.siteConfig.deleteMany.mockResolvedValue({ count: 0 })
    const { req, res } = makeReqRes('DELETE')
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.jsonBody.isDefault).toBe(true)
  })

  test('clears the server cache so pages serve the default right away', async () => {
    mockDb.siteConfig.findUnique.mockResolvedValue({ key: 'site_custom_css', value: '' })
    expect(await getSiteCSSWithSource()).toEqual({ css: '', isDefault: false })

    mockDb.siteConfig.deleteMany.mockResolvedValue({ count: 1 })
    mockDb.siteConfig.findUnique.mockResolvedValue(null)
    const { req, res } = makeReqRes('DELETE')
    await handler(req, res)

    expect(await getSiteCSSWithSource()).toEqual({ css: getDefaultSiteCSS(), isDefault: true })
  })

  test('non-admins get 403 and nothing is deleted', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'member' })
    const { req, res } = makeReqRes('DELETE')
    await handler(req, res)
    expect(res.statusCode).toBe(403)
    expect(mockDb.siteConfig.deleteMany).not.toHaveBeenCalled()
  })
})

describe('PUT', () => {
  test('saving an empty value is still allowed (explicit theme off)', async () => {
    mockDb.siteConfig.upsert.mockResolvedValue({ key: 'site_custom_css', value: '' })
    const { req, res } = makeReqRes('PUT', { css: '' })
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toEqual({ success: true, css: '', isDefault: false })
  })
})
