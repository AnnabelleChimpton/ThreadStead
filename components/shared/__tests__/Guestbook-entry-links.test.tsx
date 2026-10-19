/**
 * Guestbook notifications link to /resident/<you>?tab=guestbook#guestbook-entry-<id>.
 * The guestbook (the same component as the house mailbox) gives each entry
 * that id, scrolls to the one in the hash once the entries load, and marks it.
 * The profile's Tabs keep the hash while syncing ?tab= into the URL.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { guestbook_prompt: 'Say hi' } }) }))
jest.mock('@/components/shared/ImprovedBadgeDisplay', () => () => null)

import Guestbook from '@/components/shared/Guestbook'
import Tabs from '@/components/ui/navigation/Tabs'

const entries = [
  { id: 'e1', profileOwner: 'u1', authorId: null, authorUsername: 'pal', message: 'First', createdAt: '2026-10-01T00:00:00Z', status: 'visible' },
  { id: 'e2', profileOwner: 'u1', authorId: null, authorUsername: 'pip', message: 'Second', createdAt: '2026-10-02T00:00:00Z', status: 'visible' },
]

const scrollIntoView = jest.fn()

beforeEach(() => {
  scrollIntoView.mockClear()
  Element.prototype.scrollIntoView = scrollIntoView
  global.fetch = jest.fn(async (url: string) =>
    url.startsWith('/api/guestbook/')
      ? ({ ok: true, status: 200, json: async () => ({ entries }) } as Response)
      : ({ ok: false, status: 401, json: async () => ({}) } as Response)
  ) as any
})

describe('Guestbook entry links', () => {
  test('every entry carries its anchor id', async () => {
    window.history.replaceState(null, '', '/resident/pigeon?tab=guestbook')
    render(<Guestbook username="pigeon" />)
    expect(await screen.findByText('First')).toBeInTheDocument()
    expect(document.getElementById('guestbook-entry-e1')).not.toBeNull()
    expect(document.getElementById('guestbook-entry-e2')).not.toBeNull()
    expect(document.querySelector('.guestbook-entry-target')).toBeNull()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  test('the entry in the hash is scrolled to and marked once loaded', async () => {
    window.history.replaceState(null, '', '/resident/pigeon?tab=guestbook#guestbook-entry-e2')
    render(<Guestbook username="pigeon" />)
    await screen.findByText('Second')

    const target = document.getElementById('guestbook-entry-e2')!
    expect(target).toHaveClass('guestbook-entry-target')
    expect(target).toHaveAttribute('aria-current', 'true')
    expect(document.getElementById('guestbook-entry-e1')).not.toHaveClass('guestbook-entry-target')
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(scrollIntoView.mock.instances[0]).toBe(target)
  })

  test('a hash that changes later (same page) moves the mark', async () => {
    window.history.replaceState(null, '', '/resident/pigeon?tab=guestbook')
    render(<Guestbook username="pigeon" />)
    await screen.findByText('First')

    act(() => {
      window.history.replaceState(null, '', '/resident/pigeon?tab=guestbook#guestbook-entry-e1')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await waitFor(() => expect(document.getElementById('guestbook-entry-e1')).toHaveClass('guestbook-entry-target'))
  })
})

describe('Tabs keep the entry hash', () => {
  const tabs = [
    { id: 'blog', label: 'Blog', content: <p>posts</p> },
    { id: 'guestbook', label: 'Guestbook', content: <p>notes</p> },
  ]

  test('on the tab the page opened on, and drop it on a switch', () => {
    window.history.replaceState(null, '', '/resident/pigeon?tab=guestbook#guestbook-entry-e2')
    render(<Tabs tabs={tabs} initialId="guestbook" />)
    expect(window.location.search).toBe('?tab=guestbook')
    expect(window.location.hash).toBe('#guestbook-entry-e2')

    fireEvent.click(screen.getByRole('tab', { name: 'Blog' }))
    expect(window.location.search).toBe('?tab=blog')
    expect(window.location.hash).toBe('')
  })
})
