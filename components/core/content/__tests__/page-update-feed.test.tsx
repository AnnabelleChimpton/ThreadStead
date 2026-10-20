/**
 * "<Name> updated their page" in the feed: where the cards land among the
 * posts, and what a card shows.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/ui/navigation/UserMention', () => ({
  __esModule: true,
  default: ({ displayName }: { displayName: string }) => <a href="#">{displayName}</a>,
}))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))

import { mergeFeedItems } from '../Feed'
import PageUpdateCard from '../PageUpdateCard'
import type { FeedPostData } from '../FeedPost'
import type { FeedPageUpdate } from '@/lib/feed/page-updates'

const at = (h: number) => new Date(Date.UTC(2026, 9, 19, h)).toISOString()
const post = (id: string, h: number) => ({ id, createdAt: at(h) }) as FeedPostData
const update = (id: string, h: number, extra: Partial<FeedPageUpdate> = {}): FeedPageUpdate => ({
  id,
  userId: `u-${id}`,
  username: id,
  displayName: null,
  avatarUrl: null,
  sharedAt: at(h),
  publicPage: true,
  ...extra,
})
const order = (items: ReturnType<typeof mergeFeedItems>) =>
  items.map((i) => (i.kind === 'post' ? i.post.id : `page:${i.update.id}`))

describe('mergeFeedItems', () => {
  test('page updates go in by time; posts keep their order', () => {
    const items = mergeFeedItems([post('p10', 10), post('p8', 8), post('p5', 5)], [update('a', 3), update('b', 9), update('c', 12)])
    expect(order(items)).toEqual(['page:c', 'p10', 'page:b', 'p8', 'p5', 'page:a'])
  })

  test('no page updates: the posts as they came (the Active feed is ranked, not by time)', () => {
    const ranked = [post('old-but-busy', 1), post('new', 10)]
    expect(order(mergeFeedItems(ranked, []))).toEqual(['old-but-busy', 'new'])
  })

  test('only page updates', () => {
    expect(order(mergeFeedItems([], [update('a', 3), update('b', 9)]))).toEqual(['page:b', 'page:a'])
  })
})

describe('PageUpdateCard', () => {
  test('a public page: name, what happened, when, a live preview and a link', () => {
    render(<PageUpdateCard update={update('pat', 0, { displayName: 'Pat', sharedAt: new Date(Date.now() - 2 * 3600_000).toISOString() })} />)
    expect(screen.getByText('Pat')).toBeInTheDocument()
    expect(screen.getByText(/updated their page/)).toBeInTheDocument()
    expect(screen.getByText('about 2 hours ago')).toBeInTheDocument()
    const frame = document.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBe('/resident/pat')
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(screen.getByRole('link', { name: 'Visit their page' })).toHaveAttribute('href', '/resident/pat')
  })

  test("a page that isn't public gets no preview", () => {
    render(<PageUpdateCard update={update('sam', 1, { publicPage: false })} />)
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('link', { name: 'Visit their page' })).toHaveAttribute('href', '/resident/sam')
  })
})
