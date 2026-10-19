/**
 * The standard profile header shows the owner's banner across the top, and
 * their own status line in place of the site's resident label.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { user_status_text: 'threadstead resident' } }) }))
jest.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ user: null }) }))
jest.mock('@/contexts/ChatContext', () => ({ useChat: () => ({ openDM: jest.fn() }) }))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
jest.mock('../../social/FollowButton', () => () => null)
jest.mock('../../social/BlockButton', () => () => null)
jest.mock('../../social/MutualFriends', () => () => null)
jest.mock('../../social/FriendBadge', () => () => null)

import ProfileHeader from '../ProfileHeader'

const base = { username: 'pat', relStatus: '', onRelStatusChange: () => {}, showPixelHomeLink: false }

test('shows their own status in place of the site label', () => {
  render(<ProfileHeader {...base} status="knitting a very long scarf" />)
  expect(screen.getByText('knitting a very long scarf')).toHaveClass('ts-profile-status')
  expect(screen.queryByText('threadstead resident')).toBeNull()
})

test('without a status, the site label shows', () => {
  render(<ProfileHeader {...base} />)
  expect(screen.getByText('threadstead resident')).toHaveClass('ts-profile-status')
})

test('shows the banner only when there is one', () => {
  const { container, rerender } = render(<ProfileHeader {...base} />)
  expect(container.querySelector('.ts-profile-banner')).toBeNull()
  rerender(<ProfileHeader {...base} bannerUrl="/uploads/banner.jpg" />)
  expect(container.querySelector('.ts-profile-banner img')).toHaveAttribute('src', '/uploads/banner.jpg')
})
