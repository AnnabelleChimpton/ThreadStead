/**
 * A page of your own HTML reads the resident's posts, pictures and
 * guestbook only when something on it shows or names them.
 */
jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

import { pageReads } from '../load-resident-page'

const page = (...islands: Array<{ component: string; props?: Record<string, unknown> }>) => ({
  islands: islands.map((island, i) => ({ id: `i${i}`, props: {}, ...island })) as never,
})

test('a component that shows a list reads it', () => {
  expect(pageReads(page({ component: 'BlogPosts' }), 'posts')).toBe(true)
  expect(pageReads(page({ component: 'ImageCarousel' }), 'images')).toBe(true)
  expect(pageReads(page({ component: 'mediagrid' }), 'images')).toBe(true)
})

test('a component that names a list reads it', () => {
  expect(pageReads(page({ component: 'Show', props: { data: 'posts.length' } }), 'posts')).toBe(true)
  expect(pageReads(page({ component: 'ForEach', props: { var: 'guestbook', item: 'e' } }), 'guestbook')).toBe(true)
})

test('anything else reads none of them', () => {
  const plain = page({ component: 'DisplayName' }, { component: 'Guestbook' }, { component: 'Show', props: { data: 'postsTitle' } })
  for (const list of ['posts', 'images', 'guestbook'] as const) expect(pageReads(plain, list)).toBe(false)
})
