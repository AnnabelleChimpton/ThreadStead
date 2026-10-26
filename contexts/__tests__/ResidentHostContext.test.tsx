/**
 * On a resident's own address (pages/site/[label].tsx) nothing is signed in
 * and nothing can be written, so the guestbook form and Follow become links
 * to the page on the main site, and a private page's stub points there too.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { site_name: 'HomePageAgain', guestbook_prompt: 'Say hi' } }) }))
jest.mock('@/components/shared/ImprovedBadgeDisplay', () => () => null)
jest.mock('@/components/ui/layout/Layout', () => ({ children }: { children: React.ReactNode }) => <>{children}</>)

import Guestbook from '@/components/shared/Guestbook'
import FollowButton from '@/components/core/social/FollowButton'
import PrivateProfile from '@/components/core/profile/PrivateProfile'
import { ResidentHostProvider } from '@/contexts/ResidentHostContext'

const HOST = { mainSiteUrl: 'https://homepageagain.com', username: 'a_b' }

beforeEach(() => {
  global.fetch = jest.fn(async (url: string) =>
    url.startsWith('/api/guestbook/')
      ? ({ ok: true, status: 200, json: async () => ({ entries: [] }) } as Response)
      : url.startsWith('/api/rel/')
        ? ({ ok: true, status: 200, json: async () => ({ status: 'anon' }) } as Response)
        : ({ ok: true, status: 200, json: async () => ({ loggedIn: false }) } as Response)
  ) as any
})

test('the guestbook has no form there, just a way to sign it on the main site and come back', async () => {
  render(
    <ResidentHostProvider value={HOST}>
      <Guestbook username="a_b" />
    </ResidentHostProvider>
  )
  const link = await screen.findByRole('link', { name: 'Sign the guestbook (opens HomePageAgain)' })
  expect(link).toHaveAttribute('href', 'https://homepageagain.com/act/guestbook/a_b')
  expect(screen.queryByRole('textbox')).toBeNull()
})

test('on the main site the guestbook keeps its form', async () => {
  render(<Guestbook username="a_b" />)
  expect(await screen.findByRole('textbox')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Sign it on/ })).toBeNull()
})

test('Follow goes to the follow page on the main site', async () => {
  render(
    <ResidentHostProvider value={HOST}>
      <FollowButton username="a_b" />
    </ResidentHostProvider>
  )
  expect(await screen.findByRole('link', { name: 'Follow a_b (opens HomePageAgain)' })).toHaveAttribute('href', 'https://homepageagain.com/act/follow/a_b')
})

test("a page that isn't public points to the main site, where the visitor may be signed in", () => {
  render(
    <ResidentHostProvider value={HOST}>
      <PrivateProfile username="a_b" visibility="friends" />
    </ResidentHostProvider>
  )
  expect(screen.getByRole('link', { name: 'Open it on HomePageAgain' })).toHaveAttribute('href', 'https://homepageagain.com/resident/a_b')
})
