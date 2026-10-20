/**
 * @jest-environment node
 *
 * GET /api/user/export/page ("Download my page"): signed in only, your own
 * page only, its own rate limit, and a zip back. The real rate limiter runs;
 * only its one SQL statement is faked by an in-memory counter. Storage is
 * mocked whole, so nothing can reach R2, and picture reads go to a fake fetch.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => {
  const counts = new Map<string, number>()
  return {
    db: {
      __counts: counts,
      profile: { findUnique: jest.fn() },
      handle: { findFirst: jest.fn() },
      $queryRaw: jest.fn((_strings: TemplateStringsArray, ...values: unknown[]) => {
        const key = `${values[1]}|${values[2]}`
        const n = (counts.get(key) ?? 0) + 1
        counts.set(key, n)
        return Promise.resolve([{ requestCount: n, windowStartMs: Date.now() }])
      }),
    },
  }
})
jest.mock('@/lib/auth/server', () => ({
  ...jest.requireActual('@/lib/auth/server'),
  getSessionUser: jest.fn(),
}))
jest.mock('@/lib/storage/r2', () => ({
  keyFromPublicUrl: jest.fn((url: string) =>
    url.startsWith('https://cdn.example/') ? url.slice('https://cdn.example/'.length) : null
  ),
  publicUrl: jest.fn((key: string) => `https://cdn.example/${key}`),
  putObject: jest.fn(),
  deleteObjects: jest.fn(),
}))

import route from '@/pages/api/user/export/page'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { putObject, deleteObjects } from '@/lib/storage/r2'
import { RATE_LIMIT_CONFIGS } from '@/lib/server/http/rate-limit'
import { readStoredZip } from '@/lib/utils/zip/__tests__/read-stored-zip'

const mockDb = db as unknown as {
  __counts: Map<string, number>
  profile: { findUnique: jest.Mock }
  handle: { findFirst: jest.Mock }
}
const mockGetSessionUser = getSessionUser as jest.Mock
const realFetch = global.fetch
const fetchMock = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.__counts.clear()
  global.fetch = fetchMock as unknown as typeof fetch
  fetchMock.mockImplementation(async (url: string) => ({
    ok: true,
    headers: new Headers({ 'content-type': 'image/png', 'content-length': '4' }),
    arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    url,
  }))
  mockDb.handle.findFirst.mockResolvedValue({ handle: 'pat' })
  mockDb.profile.findUnique.mockResolvedValue({
    templateMode: 'advanced',
    customTemplate: '<img src="https://cdn.example/media/u_me/1.png"><img src="https://cdn.example/media/u_other/2.png">',
    customCSS: 'body { color: #333; }',
  })
})
afterAll(() => {
  global.fetch = realFetch
})

async function call(method = 'GET') {
  const req = {
    method,
    url: '/api/user/export/page',
    query: {},
    headers: { cookie: 'retro_session=u_me.secret' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    jsonBody: undefined as { error?: string } | undefined,
    sent: undefined as Buffer | undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: { error?: string }) {
      this.jsonBody = payload
      this.headersSent = true
      return this
    },
    send(payload: Buffer) {
      this.sent = payload
      this.headersSent = true
      return this
    },
    end() {
      this.headersSent = true
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value
    },
  }
  await route(req, res as unknown as NextApiResponse)
  return res
}

test('signed out: 401, and nothing is read', async () => {
  mockGetSessionUser.mockResolvedValue(null)
  const res = await call()
  expect(res.statusCode).toBe(401)
  expect(mockDb.profile.findUnique).not.toHaveBeenCalled()
  expect(fetchMock).not.toHaveBeenCalled()
})

test('GET only', async () => {
  mockGetSessionUser.mockResolvedValue({ id: 'u_me', role: 'member' })
  const res = await call('POST')
  expect(res.statusCode).toBe(405)
})

test("your own page as a zip, with only your own pictures, and storage only read", async () => {
  mockGetSessionUser.mockResolvedValue({ id: 'u_me', role: 'member' })
  const res = await call()
  expect(res.statusCode).toBe(200)
  expect(res.headers['content-type']).toBe('application/zip')
  expect(res.headers['content-disposition']).toBe('attachment; filename="pat-page.zip"')
  expect(res.headers['cache-control']).toBe('private, no-store')

  // The signed-in user's rows, never one named in the request
  expect(mockDb.profile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u_me' } }))
  expect(mockDb.handle.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'u_me' }) }))

  const entries = readStoredZip(res.sent!)
  expect(entries.map((e) => e.name)).toEqual(['index.html', 'style.css', 'images/media-1.png'])
  const html = entries[0].data.toString('utf8')
  expect(html).toContain('<img src="images/media-1.png">')
  expect(html).toContain('<img src="https://cdn.example/media/u_other/2.png">')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0][0]).toBe('https://cdn.example/media/u_me/1.png')
  expect(putObject).not.toHaveBeenCalled()
  expect(deleteObjects).not.toHaveBeenCalled()
})

test('rate limited per person, with its own count', async () => {
  mockGetSessionUser.mockResolvedValue({ id: 'u_me', role: 'member' })
  const limit = RATE_LIMIT_CONFIGS.uploads.limit
  for (let i = 0; i < limit; i++) expect((await call()).statusCode).toBe(200)
  const res = await call()
  expect(res.statusCode).toBe(429)
  expect(res.jsonBody?.error).toMatch(/^You've downloaded your page a lot this hour\. Try again in \d+ minutes?\.$/)
  expect([...mockDb.__counts.keys()]).toEqual(['page-download:user:u_me|uploads'])

  // Someone else still can
  mockGetSessionUser.mockResolvedValue({ id: 'u_two', role: 'member' })
  expect((await call()).statusCode).toBe(200)
})
