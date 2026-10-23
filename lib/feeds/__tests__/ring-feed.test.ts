/**
 * @jest-environment node
 *
 * Which hub PostRefs become items in a ring's feed: local public posts by
 * active residents, links for posts from elsewhere; never prompts, hidden
 * authors' posts, or anything that isn't public.
 */
const BASE = 'https://homepageagain.com'

const mockFacts = jest.fn()
const mockGetRingFeed = jest.fn()
const mockFindMany = jest.fn()
const mockHiddenIds = jest.fn()
const mockHiddenDids = jest.fn()

jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => BASE }))
jest.mock('@/lib/config/database/connection', () => ({ db: { post: { findMany: (...a: unknown[]) => mockFindMany(...a) } } }))
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }))
jest.mock('@/lib/rings/walk', () => ({ ringFacts: (...a: unknown[]) => mockFacts(...a) }))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getPublicRingHubClient: () => ({ getRingFeed: (...a: unknown[]) => mockGetRingFeed(...a) }) }))
jest.mock('@/lib/domain/users/blocks', () => ({
  getHiddenIds: (...a: unknown[]) => mockHiddenIds(...a),
  getBlockedUserDids: (...a: unknown[]) => mockHiddenDids(...a),
}))

import { ringFeed } from '@/lib/feeds/ring-feed'

const localPost = (id: string, authorId = 'u1') => ({
  id,
  authorId,
  title: `Post ${id}`,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  bodyHtml: null,
  bodyMarkdown: 'hello',
  bodyText: null,
  excerpt: null,
  textPreview: 'hello',
  tags: [],
  contentWarning: null,
  isSpoiler: false,
  author: { primaryHandle: 'alice@HomePageAgain', profile: { displayName: 'Alice' } },
})

const ref = (uri: string, extra: Record<string, unknown> = {}) => ({
  uri,
  digest: 'd',
  submittedBy: 'did:web:homepageagain.com:users:aaa',
  submittedAt: '2026-10-02T00:00:00Z',
  isPinned: false,
  ...extra,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockFacts.mockResolvedValue({ slug: 'knits', name: 'Cozy Knits', visibility: 'PUBLIC', joinPolicy: 'OPEN', badgeImageUrl: null })
  mockHiddenIds.mockResolvedValue({ blockedUserIds: ['banned-user'] })
  mockHiddenDids.mockResolvedValue(new Set(['did:web:homepageagain.com:users:banned']))
})

it('keeps the hub order: local public posts in full, outside posts as links', async () => {
  mockGetRingFeed.mockResolvedValue({
    total: 4,
    posts: [
      ref(`${BASE}/resident/alice/post/p1`),
      ref('https://elsewhere.example/notes/7', { metadata: { title: 'A note', actorName: 'Robin' } }),
      ref(`${BASE}/resident/alice/post/p2`),
      ref(`${BASE}/resident/alice/post/gone`),
    ],
  })
  // p2 is followers-only and "gone" was deleted: findMany only returns public, existing posts
  mockFindMany.mockResolvedValue([localPost('p1')])

  const feed = await ringFeed('knits')
  if (!feed || feed === 'unavailable') throw new Error('expected a feed')
  expect(feed.title).toBe('Cozy Knits, a ring on HomePageAgain')
  expect(feed.items.map((i) => i.url)).toEqual([`${BASE}/resident/alice/post/p1`, 'https://elsewhere.example/notes/7'])
  expect(feed.items[0]).toMatchObject({ title: 'Post p1', author: 'Alice' })
  expect(feed.items[1]).toMatchObject({ title: 'A note', author: 'Robin' })
  expect(feed.items[1].html).toBeUndefined()

  // Only public posts by residents who aren't suspended or banned are read
  const where = mockFindMany.mock.calls[0][0].where
  expect(where).toMatchObject({ visibility: 'public', authorId: { notIn: ['banned-user'] } })
  expect(where.id.in).toEqual(['p1', 'p2', 'gone'])
})

it('leaves out prompts, hidden authors and non-web links', async () => {
  mockGetRingFeed.mockResolvedValue({
    total: 3,
    posts: [
      ref(`${BASE}/resident/alice/post/p1`, { metadata: { type: 'threadring_prompt' } }),
      ref('https://elsewhere.example/x', { actorDid: 'did:web:homepageagain.com:users:banned' }),
      ref('javascript:alert(1)'),
    ],
  })
  mockFindMany.mockResolvedValue([])
  const feed = await ringFeed('knits')
  if (!feed || feed === 'unavailable') throw new Error('expected a feed')
  expect(feed.items).toEqual([])
})

it('has no feed for a ring that is not public', async () => {
  mockFacts.mockResolvedValue({ slug: 'knits', name: 'Cozy Knits', visibility: 'UNLISTED', joinPolicy: 'OPEN', badgeImageUrl: null })
  expect(await ringFeed('knits')).toBeNull()
  expect(mockGetRingFeed).not.toHaveBeenCalled()
})

it('says the hub is unavailable rather than serving an empty ring', async () => {
  mockGetRingFeed.mockRejectedValue(new Error('hub down'))
  expect(await ringFeed('knits')).toBe('unavailable')
})
