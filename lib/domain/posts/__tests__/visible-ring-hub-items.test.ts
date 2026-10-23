/**
 * @jest-environment node
 *
 * The /feed ring tabs list what Ring Hub returns. Our own posts that this
 * viewer can't read (made followers-only, friends-only or private after
 * they were shared, or deleted here) are left out, rather than shown as an
 * empty placeholder. Posts from other sites pass through.
 */
const BASE = 'https://homepageagain.com'
jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => BASE }))
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: {
      findMany: async () => [
        { id: 'pub', authorId: 'ann', visibility: 'public' },
        { id: 'fol', authorId: 'ann', visibility: 'followers' },
        { id: 'priv', authorId: 'ann', visibility: 'private' },
      ],
    },
    // bob follows ann (accepted); ann doesn't follow bob
    follow: {
      findUnique: async ({ where }: any) =>
        where.followerId_followeeId.followerId === 'bob' ? { status: 'accepted' } : null,
    },
  },
}))

import { visibleRingHubItems } from '@/lib/domain/posts/visibility'

const items = ['pub', 'fol', 'priv', 'gone'].map((id) => ({ uri: `${BASE}/resident/ann/post/${id}` }))
  .concat({ uri: 'https://elsewhere.example/notes/1' })
const ids = (list: { uri: string }[]) => list.map((item) => item.uri.split('/').pop())

it('shows each viewer only the posts they could read here', async () => {
  expect(ids(await visibleRingHubItems(items, null))).toEqual(['pub', '1'])
  expect(ids(await visibleRingHubItems(items, 'bob'))).toEqual(['pub', 'fol', '1'])
  expect(ids(await visibleRingHubItems(items, 'ann'))).toEqual(['pub', 'fol', 'priv', '1'])
})
