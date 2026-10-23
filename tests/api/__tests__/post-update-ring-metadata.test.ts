/**
 * Editing a post re-sends it to the rings it's in, as its author (the hub's
 * edit path). Hub metadata is served to anyone, so a post that isn't public
 * sends none of its words: it stays in its rings as a bare link, and making
 * it public again sends them back. It used to send nothing for a private
 * post, so the hub kept its last public title and preview.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const mockSubmit = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: {
      findUnique: jest.fn(async () => ({ id: 'p1', authorId: 'u1', bodyHtml: null, visibility: 'public', contentWarning: null, isSpoiler: false })),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'u1' })) }))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: () => ({ submitPost: (...a: unknown[]) => mockSubmit(...a) }),
}))
jest.mock('@/lib/server/http/csrf', () => ({ withCsrfProtection: (h: any) => h }))
jest.mock('@/lib/server/http/rate-limit', () => ({ withRateLimit: () => (h: any) => h }))
jest.mock('@/lib/webmentions/send', () => ({ queueTellLinkedSites: jest.fn() }))

import handler from '@/pages/api/posts/update'

const saved = (visibility: string) => ({
  id: 'p1',
  title: 'Garden beds',
  bodyText: 'Moved the beds to the sunny side.',
  bodyHtml: null,
  bodyMarkdown: null,
  visibility,
  isSpoiler: false,
  contentWarning: null,
  metadata: { mood: 'sunny' },
  createdAt: new Date('2026-10-01T00:00:00Z'),
  publishedAt: null,
  threadRingPostIds: { knits: 'ref1' },
  author: { primaryHandle: 'ann@HomePageAgain', profile: null },
  threadRings: [{ threadRing: { slug: 'knits', name: 'Cozy Knits' } }],
})

async function edit(visibility: string) {
  mockUpdate.mockResolvedValue(saved(visibility))
  const req = { method: 'POST', body: { id: 'p1', visibility }, headers: {} } as unknown as NextApiRequest
  const res: any = { status(c: number) { this.statusCode = c; return this }, json(b: any) { this.body = b; return this } }
  await handler(req, res as NextApiResponse)
  return mockSubmit.mock.calls[0]
}

beforeEach(() => jest.clearAllMocks())

it('sends no words for a post that is no longer public, and keeps its place in the ring', async () => {
  const [slug, { uri, metadata }] = await edit('followers')
  expect(slug).toBe('knits')
  expect(uri).toContain('/post/p1')
  expect(metadata).toEqual({ platform: 'blog', threadRingSlug: 'knits', threadRingName: 'Cozy Knits', title: '', textPreview: '', excerpt: '' })
})

it('sends them back when it is public again', async () => {
  const [, { metadata }] = await edit('public')
  expect(metadata).toMatchObject({ title: 'Garden beds', mood: 'sunny' })
  expect(metadata.textPreview).toContain('sunny side')
})
