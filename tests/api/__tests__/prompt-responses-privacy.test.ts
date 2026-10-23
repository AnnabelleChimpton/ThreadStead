/**
 * GET /api/threadrings/[slug]/prompts/[promptId]/responses shows a response's
 * post in full only when it's our own public post by a resident this viewer
 * may see. It used to load any local post whose id ended a submitted URI
 * (from any host) and return its whole body, private or not, under an author
 * name taken from the submitter's own metadata.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const BASE = 'https://homepageagain.com'
const mockFindMany = jest.fn()
const mockResponses = jest.fn()

jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => BASE }))
jest.mock('@/lib/config/database/connection', () => ({ db: { post: { findMany: (...a: unknown[]) => mockFindMany(...a) } } }))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'viewer' })) }))
jest.mock('@/lib/domain/users/blocks', () => ({ getHiddenIds: jest.fn(async () => ({ blockedUserIds: ['banned'] })) }))
jest.mock('@/lib/api/ringhub/ringhub-middleware', () => ({
  withThreadRingSupport: (handler: any) => (req: any, res: any) => handler(req, res, 'ringhub'),
}))
jest.mock('@/lib/utils/data/prompt-service', () => ({
  promptFeedReader: async () => null,
  createPromptService: () => ({
    getPromptDetails: async () => ({ prompt: { id: 'p1' } }),
    getPromptResponses: (...a: unknown[]) => mockResponses(...a),
  }),
}))

import handler from '@/pages/api/threadrings/[slug]/prompts/[promptId]/responses'

const ref = (id: string, uri: string, metadata: Record<string, unknown> = {}) => ({
  id,
  uri,
  submittedAt: '2026-10-20T00:00:00.000Z',
  submittedBy: `did:web:elsewhere.example:users:${id}`,
  metadata,
})

async function get() {
  const req = { method: 'GET', query: { slug: 'knits', promptId: 'p1' }, headers: {} } as unknown as NextApiRequest
  const res: any = { status(c: number) { this.statusCode = c; return this }, json(b: any) { this.body = b; return this } }
  await handler(req, res as NextApiResponse)
  return res
}

beforeEach(() => jest.clearAllMocks())

it('reads only our public posts by residents the viewer may see', async () => {
  mockResponses.mockResolvedValue([
    ref('r1', `${BASE}/resident/ann/post/postpublic1`),
    ref('r2', `${BASE}/resident/ann/post/postprivate1`),
    // A post id at the end of someone else's URI is never looked up here
    ref('r3', 'https://evil.example/resident/ann/post/postprivate1', { title: 'Stolen?', textPreview: 'nope' }),
  ])
  // The database only returns what the where clause allows: the public one
  mockFindMany.mockResolvedValue([
    {
      id: 'postpublic1', title: 'Socks', bodyText: 'Turned a heel', bodyHtml: null, bodyMarkdown: null, visibility: 'public',
      createdAt: new Date('2026-10-20T00:00:00Z'), authorId: 'u_ann',
      author: { id: 'u_ann', primaryHandle: 'ann@HomePageAgain', profile: { displayName: 'Ann', avatarUrl: null } },
    },
  ])

  const res = await get()
  expect(res.statusCode).toBe(200)
  expect(mockFindMany.mock.calls[0][0].where).toEqual({
    id: { in: ['postpublic1', 'postprivate1'] },
    visibility: 'public',
    authorId: { notIn: ['banned'] },
  })

  const [shown, hidden, outside] = res.body.responses.map((r: any) => r.post)
  expect(shown).toMatchObject({ title: 'Socks', bodyText: 'Turned a heel', url: '/resident/ann/post/postpublic1' })
  expect(shown.author.handles).toEqual([{ handle: 'ann' }])
  // Not shown in full: only the PostRef's own title and preview, and no resident's name
  expect(hidden).toMatchObject({ bodyHtml: null, bodyMarkdown: null })
  expect(hidden.author.handles).toEqual([])
  expect(outside).toMatchObject({ title: 'Stolen?', bodyText: 'nope', url: 'https://evil.example/resident/ann/post/postprivate1' })
})

it('names nobody for one of our posts that is not shown, or whose author has no handle', async () => {
  mockResponses.mockResolvedValue([
    ref('r1', `${BASE}/resident/ann/post/postprivate1`, { actorName: 'Ann (suspended)' }),
    ref('r2', `${BASE}/resident/x/post/postnohandle`, { actorName: 'Nameless' }),
  ])
  mockFindMany.mockResolvedValue([
    {
      id: 'postnohandle', title: 'Hi', bodyText: 'full body', bodyHtml: null, bodyMarkdown: null, visibility: 'public',
      createdAt: new Date('2026-10-20T00:00:00Z'), authorId: 'u_x',
      author: { id: 'u_x', primaryHandle: null, profile: { displayName: 'X', avatarUrl: null } },
    },
  ])
  const [hidden, nohandle] = (await get()).body.responses.map((r: any) => r.post)
  expect(hidden.author.profile.displayName).toBeNull()
  expect(nohandle).toMatchObject({ bodyText: null, url: expect.not.stringContaining('unknown') })
  expect(nohandle.author).toMatchObject({ handles: [], profile: { displayName: null } })
})

it("never names a resident from the submitter's own metadata", async () => {
  mockResponses.mockResolvedValue([
    ref('r1', 'https://elsewhere.example/notes/1', { threadsteadUserId: 'u_ann', authorHandle: 'ann@HomePageAgain', actorName: 'Robin' }),
  ])
  mockFindMany.mockResolvedValue([])
  const [response] = (await get()).body.responses
  expect(response.post.author).toEqual({
    id: 'did:web:elsewhere.example:users:r1',
    handles: [],
    profile: { displayName: 'Robin', avatarUrl: null },
  })
})
