/**
 * Ring prompts (PostRefs in the ring's Ring Hub feed):
 *  - only the Host and moderators post one; the hub itself only checks the
 *    ring's posting rule, so anyone could before;
 *  - the whole feed is read, once, so a prompt doesn't vanish after 50 newer
 *    posts and response counts don't refetch it per prompt;
 *  - prompts can't be edited (the hub can't change a posted PostRef).
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: { userDID: { findUnique: jest.fn() }, ringHubOwnership: { findUnique: jest.fn() } },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  getRingHubClient: jest.fn(),
  getPublicRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
  AuthenticatedRingHubClient: jest.fn(),
}))

import promptsRoute from '@/pages/api/threadrings/[slug]/prompts'
import promptRoute from '@/pages/api/threadrings/[slug]/prompts/[promptId]'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { AuthenticatedRingHubClient, createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'

const HOST_DID = 'did:web:homepageagain.com:users:host'

const prompt = (id: string, isActive = true) => ({
  id: `ref-${id}`, uri: `threadring://prompt/${id}`, submittedBy: HOST_DID, submittedAt: '2026-10-01T00:00:00Z', status: 'ACCEPTED',
  metadata: { type: 'threadring_prompt', prompt: { promptId: id, title: `Prompt ${id}`, description: 'd', startsAt: '2026-10-01T00:00:00Z', isActive, isPinned: false, responseCount: 0 } },
})
const response = (n: number, promptId: string) => ({
  id: `resp-${n}`, uri: `https://homepageagain.com/resident/ann/post/p${n}`, submittedBy: 'did:x', submittedAt: '2026-10-02T00:00:00Z', status: 'ACCEPTED',
  metadata: { type: 'prompt_response', response: { promptId } },
})
const post = (n: number) => ({ id: `post-${n}`, uri: `https://elsewhere.example/${n}`, submittedBy: 'did:x', submittedAt: '2026-10-03T00:00:00Z', status: 'ACCEPTED', metadata: {} })

let feed: any[]
let site: { getRingFeed: jest.Mock }
let member: Record<string, jest.Mock>

async function call(route: any, method: string, query: Record<string, string>, body?: unknown) {
  const req = { method, query, body, headers: {}, url: '/api/x' } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; return this },
    setHeader: jest.fn(),
  }
  await route(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
  // The prompt is older than 150 posts; it has two responses among them
  feed = [...Array.from({ length: 150 }, (_, i) => (i === 20 || i === 120 ? response(i, 'old') : post(i))), prompt('old')]
  site = {
    getRingFeed: jest.fn(async (_slug: string, { limit, offset }: { limit: number; offset: number }) => ({
      posts: feed.slice(offset, offset + limit), total: feed.length,
    })),
  }
  ;(getRingHubClient as jest.Mock).mockReturnValue(site)
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  ;(db.userDID.findUnique as jest.Mock).mockImplementation(async ({ where }: any) =>
    where.userId === 'host-1' ? { did: HOST_DID } : where.userId === 'member-1' ? { did: 'did:web:homepageagain.com:users:m' } : null
  )
  member = {
    getRingAsMember: jest.fn().mockResolvedValue({ slug: 'knits', name: 'Knits', ownerDid: HOST_DID, visibility: 'PUBLIC' }),
    getRingMembers: jest.fn().mockResolvedValue({ members: [], total: 0, limit: 100, offset: 0, hasMore: false }),
    submitPost: jest.fn(async (_slug: string, s: any) => ({ id: 'ref-new', uri: s.uri, digest: s.digest, submittedBy: HOST_DID, submittedAt: 'now', status: 'ACCEPTED' })),
  }
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(member)
  ;(AuthenticatedRingHubClient as unknown as jest.Mock).mockImplementation(() => member)
})

test('a prompt older than the newest 100 posts is still found, with its responses, in one read of the feed', async () => {
  const res = await call(promptsRoute, 'GET', { slug: 'knits' })
  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual([expect.objectContaining({ id: 'old', responseCount: 2 })])
  expect(site.getRingFeed.mock.calls).toEqual([
    ['knits', { limit: 100, offset: 0 }],
    ['knits', { limit: 100, offset: 100 }],
  ])
})

test('inactive prompts only when asked', async () => {
  feed = [prompt('a', false), prompt('b')]
  expect((await call(promptsRoute, 'GET', { slug: 'knits' })).body.map((p: any) => p.id)).toEqual(['b'])
  expect((await call(promptsRoute, 'GET', { slug: 'knits', includeInactive: 'true' })).body).toHaveLength(2)
})

test('the Host posts a prompt, signed as themselves', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'host-1', role: 'member' })
  const res = await call(promptsRoute, 'POST', { slug: 'knits' }, { title: 'Socks', description: 'Show your socks' })
  expect(res.statusCode).toBe(201)
  expect(res.body).toMatchObject({ title: 'Socks', isActive: true })
  expect(member.submitPost).toHaveBeenCalledWith('knits', expect.objectContaining({ metadata: expect.objectContaining({ type: 'threadring_prompt' }) }))
})

test('prompts are never pinned: "Show it on the ring page" is all there is', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'host-1', role: 'member' })
  await call(promptsRoute, 'POST', { slug: 'knits' }, { title: 'Socks', description: 'd', isActive: false, isPinned: true })
  const sent = member.submitPost.mock.calls[0][1].metadata.prompt
  expect(sent).toMatchObject({ isActive: false, isPinned: false })
})

test('a plain member, or someone signed out, is refused before the hub is asked', async () => {
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'member-1', role: 'member' })
  expect((await call(promptsRoute, 'POST', { slug: 'knits' }, { title: 'Mine', description: 'd' })).statusCode).toBe(403)
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
  expect((await call(promptsRoute, 'POST', { slug: 'knits' }, { title: 'Mine', description: 'd' })).statusCode).toBe(401)
  expect(member.submitPost).not.toHaveBeenCalled()
})

test('editing a prompt is not a thing', async () => {
  const res = await call(promptRoute, 'PUT', { slug: 'knits', promptId: 'old' }, { title: 'x' })
  expect(res.statusCode).toBe(405)
})
