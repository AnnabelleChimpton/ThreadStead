/**
 * POST /api/community-index/track-click-and-submit queues a clicked off-site
 * result for the Indie Index. IndexedSite rows are public (browse, validation
 * queue), so the visitor's search words must never land in them, and
 * logged-out visitors get no DiscoveryPath row (it used to be keyed on
 * `anonymous_<IP>`, which failed the User FK and would have stored an IP).
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    indexedSite: { findUnique: jest.fn(), create: jest.fn() },
    crawlQueue: { create: jest.fn() },
    discoveryPath: { create: jest.fn() },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/community-index/seeding/quality-filter', () => ({
  SeedingFilter: jest.fn().mockImplementation(() => ({
    evaluateSite: jest.fn(async () => ({
      shouldSeed: true,
      score: 40,
      confidence: 0.5,
      reasons: ['personal_domain'],
      suggestedCategory: 'personal_blog',
      priority: 3,
    })),
  })),
}))

import handler from '@/pages/api/community-index/track-click-and-submit'
import { db } from '@/lib/config/database/connection'
import { getSessionUser } from '@/lib/auth/server'

const QUERY = 'my embarrassing search words'
const mockDb = db as unknown as {
  indexedSite: { findUnique: jest.Mock; create: jest.Mock }
  crawlQueue: { create: jest.Mock }
  discoveryPath: { create: jest.Mock }
}

async function call(body: unknown, session: object | null = null) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(session)
  const req = {
    method: 'POST',
    body,
    headers: { 'x-forwarded-for': '203.0.113.7' },
    cookies: {},
    socket: { remoteAddress: '203.0.113.7' },
    url: '/api/community-index/track-click-and-submit',
    query: {},
  } as unknown as NextApiRequest
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

const click = (snippet?: string) => ({
  result: { url: 'https://someone.example/', title: 'Someone’s garden', snippet, engine: 'web' },
  searchQuery: QUERY, // an old client may still send it; it must be ignored
  searchTab: 'web',
  sessionId: '123',
})

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.indexedSite.findUnique.mockResolvedValue(null)
  mockDb.indexedSite.create.mockImplementation(async ({ data }: any) => ({ id: 'site1', ...data }))
  mockDb.crawlQueue.create.mockResolvedValue({})
})

test('a new site is queued without the search words, even with no snippet', async () => {
  const res = await call(click())
  expect(res.statusCode).toBe(200)
  expect(res.body.submission.action).toBe('submitted')

  const { data } = mockDb.indexedSite.create.mock.calls[0][0]
  expect(data.discoveryContext).toBe('search_click')
  expect(data.description).toBeNull()
  expect(JSON.stringify(data)).not.toContain(QUERY)
})

test('the snippet is used as the description', async () => {
  await call(click('A small site about tomatoes.'))
  const { data } = mockDb.indexedSite.create.mock.calls[0][0]
  expect(data.description).toBe('A small site about tomatoes.')
  expect(data.discoveryContext).toBe('search_click')
})

test('logged-out clicks write no discovery path and store no IP', async () => {
  mockDb.indexedSite.findUnique.mockResolvedValue({ id: 'site1' })
  const res = await call(click())
  expect(res.statusCode).toBe(200)
  expect(res.body.submission.action).toBe('already_indexed')
  expect(mockDb.discoveryPath.create).not.toHaveBeenCalled()
})

test('signed-in clicks on an indexed site record a path for that user only', async () => {
  mockDb.indexedSite.findUnique.mockResolvedValue({ id: 'site1' })
  await call(click(), { id: 'u1', role: 'member' })
  expect(mockDb.discoveryPath.create).toHaveBeenCalledTimes(1)
  const { data } = mockDb.discoveryPath.create.mock.calls[0][0]
  expect(data.discoveredBy).toBe('u1')
  expect(JSON.stringify(data)).not.toContain(QUERY)
  expect(JSON.stringify(data)).not.toContain('203.0.113.7')
})

test('signed-in submissions keep submittedBy', async () => {
  await call(click(), { id: 'u1', role: 'member' })
  const { data } = mockDb.indexedSite.create.mock.calls[0][0]
  expect(data.submittedBy).toBe('u1')
  expect(JSON.stringify(data)).not.toContain(QUERY)
})

test('a missing url is a 400', async () => {
  const res = await call({ result: {} })
  expect(res.statusCode).toBe(400)
  expect(mockDb.indexedSite.create).not.toHaveBeenCalled()
})
