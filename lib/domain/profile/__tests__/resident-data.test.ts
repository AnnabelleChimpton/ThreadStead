/**
 * What a page's components read, built one way for the live page and the
 * editor's preview (lib/domain/profile/resident-data.ts). The preview had
 * its own builder: "No Photo" where the page shows the default avatar, a
 * badge asking for a house that wasn't there, "(No content)" posts.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: { follow: { findUnique: jest.fn(async () => null) }, profile: { findUnique: jest.fn(async () => null) } },
}))
jest.mock('@/lib/utils/data/fetchers', () => ({
  getPostsForUser: jest.fn(async () => ({
    posts: [
      { id: 'p1', bodyMarkdown: 'Moved the **garden beds**.', createdAt: '2026-10-20T00:00:00.000Z' },
      { id: 'p2', bodyHtml: '<p>A new gif</p>', createdAt: '2026-10-19T00:00:00.000Z' },
    ],
  })),
  getGuestbookForUser: jest.fn(async () => ({ entries: [] })),
  getPhotosForUser: jest.fn(async () => ({ media: [] })),
}))
jest.mock('@/lib/templates/page-home', () => ({
  pageHomeFor: jest.fn(async () => ({ template: 'cottage_v1', palette: 'thread_sage', customizations: {}, number: 3, snapshotCardUrl: null })),
  pageHomeIfUsed: jest.fn(async () => undefined),
}))

import { residentDataFor, ownerOnlyData } from '../resident-data'
import { getPostsForUser } from '@/lib/utils/data/fetchers'
import type { ResidentPage } from '../load-resident-page'

const resident = (extra: Partial<ResidentPage> = {}) =>
  ({ userId: 'u1', username: 'robin', profile: { displayName: 'Robin', avatarUrl: null, bio: null, cssMode: 'inherit' }, profileMidi: null, hasPixelHome: false, ...extra }) as unknown as ResidentPage

const draft = { reads: 'all' as const, profileMidi: null }

test('the default avatar when there is no photo, like the page', async () => {
  expect((await residentDataFor(resident(), null, draft)).owner.avatarUrl).toBe('/assets/default-avatar.gif')
  expect(ownerOnlyData(resident()).owner.avatarUrl).toBe('/assets/default-avatar.gif')
})

test('no home: null, so the house components stay out; a home: the home itself', async () => {
  expect((await residentDataFor(resident(), null, draft)).pixelHome).toBeNull()
  expect((await residentDataFor(resident({ hasPixelHome: true }), null, draft)).pixelHome).toMatchObject({ template: 'cottage_v1' })
})

test("each post gets its body from the posts' own fields", async () => {
  const data = await residentDataFor(resident(), null, draft)
  expect(data.posts.map((p) => p.bodyHtml)).toEqual([expect.stringContaining('<strong>garden beds</strong>'), '<p>A new gif</p>'])
})

test('the live page loads posts only when the page shows them', async () => {
  ;(getPostsForUser as jest.Mock).mockClear()
  const data = await residentDataFor(resident(), null, { reads: { islands: [] }, profileMidi: null })
  expect(getPostsForUser).not.toHaveBeenCalled()
  expect(data.posts).toEqual([])
})
