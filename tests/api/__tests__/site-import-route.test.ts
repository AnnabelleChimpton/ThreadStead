/**
 * @jest-environment node
 *
 * /api/sites/import: you bring a page in from your own verified site only;
 * anyone else's, or one not verified, is a 404 and nothing is fetched.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: { externalSite: { findMany: jest.fn(), findFirst: jest.fn() } },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))
jest.mock('@/lib/templates/editor/site-import', () => ({ importSitePage: jest.fn(async () => ({ ok: true, html: '<p>hi</p>' })) }))

import handler from '@/pages/api/sites/import'
import { db } from '@/lib/config/database/connection'
import { getSessionUser } from '@/lib/auth/server'
import { importSitePage } from '@/lib/templates/editor/site-import'

async function call(method: string, body?: unknown) {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'u_pat' })
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; return this },
    setHeader: jest.fn(),
  }
  await handler({ method, body, query: {}, headers: {}, cookies: {} } as unknown as NextApiRequest, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

test('lists only your own verified sites', async () => {
  ;(db.externalSite.findMany as jest.Mock).mockResolvedValue([{ id: 's1', url: 'https://pat.neocities.org/' }])
  const res = await call('GET')
  expect(db.externalSite.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u_pat', state: 'verified' } }))
  expect(res.body).toEqual({ sites: [{ id: 's1', address: 'pat.neocities.org' }] })
})

test("someone else's site, or one not verified, is a 404, with nothing fetched", async () => {
  ;(db.externalSite.findFirst as jest.Mock).mockResolvedValue(null)
  const res = await call('POST', { id: 's_other' })
  expect(db.externalSite.findFirst).toHaveBeenCalledWith({ where: { id: 's_other', userId: 'u_pat', state: 'verified' } })
  expect(res.statusCode).toBe(404)
  expect(importSitePage).not.toHaveBeenCalled()
})

test('your verified site comes back as HTML for the editor', async () => {
  ;(db.externalSite.findFirst as jest.Mock).mockResolvedValue({ id: 's1', url: 'https://pat.neocities.org/', siteRef: 'pat.neocities.org' })
  const res = await call('POST', { id: 's1' })
  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ html: '<p>hi</p>' })
})
