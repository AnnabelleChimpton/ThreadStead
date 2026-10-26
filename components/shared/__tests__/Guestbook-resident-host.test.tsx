/**
 * On a resident's own address (alice.homepageagain.com) nobody is signed in,
 * so the guestbook is read there and signed on the main site. It says so,
 * rather than offering a lone button that read like "you need to sign in".
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { site_name: 'HomePageAgain', guestbook_prompt: 'Say hi' } }) }))
jest.mock('@/components/shared/ImprovedBadgeDisplay', () => () => null)

import Guestbook from '@/components/shared/Guestbook'
import { ResidentHostProvider } from '@/contexts/ResidentHostContext'

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ entries: [] }) } as Response)) as typeof fetch
})

test('on their own address: read here, signed on the main site, no form', async () => {
  render(
    <ResidentHostProvider value={{ mainSiteUrl: 'https://homepageagain.com', username: 'pigeon' }}>
      <Guestbook username="pigeon" />
    </ResidentHostProvider>
  )
  expect(await screen.findByText('You can read this guestbook here. Signing it happens on HomePageAgain.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sign it on HomePageAgain' })).toHaveAttribute('href', 'https://homepageagain.com/resident/pigeon?tab=guestbook')
  expect(screen.queryByRole('textbox')).toBeNull()
})

test('on the main site: the form, and no note', async () => {
  render(<Guestbook username="pigeon" />)
  expect(await screen.findByRole('textbox')).toBeInTheDocument()
  expect(screen.queryByText(/Signing it happens on/)).toBeNull()
})
