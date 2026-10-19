/**
 * Widget links that used to 404: the quick-action pixel home went to
 * /pixel-homes/build, and the neighbor widgets went to /directory.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { quickActionsWidget } from '../examples/QuickActionsWidget'
import { newNeighborsWidget } from '../examples/NewNeighborsWidget'
import { friendActivityWidget } from '../examples/FriendActivityWidget'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
jest.mock('@/components/ui/navigation/UserMention', () => function UserMention({ username }: { username: string }) {
  return <span>{username}</span>
})

const me = { id: 'u1', primaryHandle: 'annie@HomePageAgain' } as any

describe('widget links', () => {
  it('quick actions: Pixel Home goes to your own /home page', () => {
    const QuickActions = quickActionsWidget.component
    render(<QuickActions config={quickActionsWidget.config} user={me} />)
    expect(screen.getByTitle('Customize your pixel home')).toHaveAttribute('href', '/home/annie')
  })

  it('new neighbors: "View all" goes to the residents page', () => {
    const NewNeighbors = newNeighborsWidget.component
    const users = ['a', 'b', 'c', 'd'].map((id) => ({
      id, username: id, displayName: null, bio: null, avatarUrl: null,
      createdAt: '2026-10-01T00:00:00Z', postCount: 0, followerCount: 0, followingCount: 0,
    }))
    render(<NewNeighbors config={newNeighborsWidget.config} data={{ users, total: 4 }} />)
    expect(screen.getByRole('link', { name: /View all 4 neighbors/ })).toHaveAttribute(
      'href',
      '/neighborhood/residents'
    )
  })

  it('friend activity: the empty state links to the residents page', () => {
    const FriendActivity = friendActivityWidget.component
    render(
      <FriendActivity config={friendActivityWidget.config} user={me} data={{ friends: [], recentPosts: [] }} />
    )
    expect(screen.getByRole('link', { name: /Find friends/ })).toHaveAttribute(
      'href',
      '/neighborhood/residents'
    )
  })
})
