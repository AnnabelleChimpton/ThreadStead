/**
 * Posts on a page of your own HTML lead to their own page, where people can
 * read and comment. They only linked to /resident/<h>?tab=blog, which on
 * such a page reloads the same page, and titles were dropped (template audit
 * 16 #1). Comment counts come with the page's posts, not a request per post.
 */
import React from 'react'
import { screen } from '@testing-library/react'
import BlogPosts from '../BlogPosts'
import { renderWithTemplateContext, createMockResidentData } from './test-utils'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
// The real PostItem, outside the app's chat provider
jest.mock('@/contexts/ChatContext', () => ({ ...jest.requireActual('@/contexts/ChatContext'), useChat: () => ({ openChat: jest.fn() }) }))

beforeAll(() => {
  // jsdom has no IntersectionObserver (PostItem's view tracking)
  ;(global as any).IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} }
})

test("each post links to its own page, with its title and comment count", () => {
  const residentData = createMockResidentData({
    posts: [{ id: 'p1', title: 'Garden beds', commentCount: 3, bodyHtml: '<p>Moved them.</p>', createdAt: '2026-10-01T00:00:00.000Z' }],
  })
  renderWithTemplateContext(<BlogPosts />, { residentData })
  expect(screen.getByRole('link', { name: /Garden beds/ }).getAttribute('href')).toBe('/resident/testuser/post/p1')
  expect(screen.getByRole('link', { name: /Open post/ }).getAttribute('href')).toBe('/resident/testuser/post/p1')
  expect(screen.queryByRole('link', { name: /View on profile/ })).toBeNull()
  expect(screen.getByText('3')).toBeInTheDocument()
})
