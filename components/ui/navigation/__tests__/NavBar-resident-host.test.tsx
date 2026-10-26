/**
 * On a resident's own address nobody is signed in (that address never sees
 * a session), so the nav doesn't say "visitor mode" or offer Log in to
 * people who are signed in on the main site: it offers the page there.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import NavBar from '../NavBar'
import { ResidentHostProvider } from '@/contexts/ResidentHostContext'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/', pathname: '/site/[label]', query: {}, events: { on: jest.fn(), off: jest.fn() } }) }))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
jest.mock('@/hooks/useNavPages', () => ({ useNavPages: () => ({ pages: [] }) }))
jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { site_name: 'HomePageAgain', site_tagline: '' } }) }))
jest.mock('@/hooks/useMe', () => ({ useMe: () => ({ me: { loggedIn: false }, isLoading: false }) }))
jest.mock('@/components/features/search/HeaderSearch', () => () => null)

function at(width: number) {
  window.matchMedia = jest.fn((query: string) => ({
    matches: width >= Number(query.match(/min-width: (\d+)px/)?.[1] ?? Infinity),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
}

const host = { mainSiteUrl: 'https://homepageagain.com', username: 'alice' }

test('on a resident address: a link to the page on the main site, no visitor mode or Log in', async () => {
  at(1280)
  render(<ResidentHostProvider value={host}><NavBar /></ResidentHostProvider>)
  const links = await screen.findAllByRole('link', { name: 'Open on HomePageAgain' })
  expect(links[0]).toHaveAttribute('href', 'https://homepageagain.com/resident/alice')
  // The phone menu says the same
  fireEvent.click(screen.getByRole('button', { name: /menu/i }))
  expect(screen.queryByText('visitor mode')).toBeNull()
  expect(screen.queryByRole('button', { name: /log in/i })).toBeNull()
})

test('on the main site, signed out: visitor mode as before', async () => {
  at(800)
  render(<NavBar />)
  fireEvent.click(screen.getByRole('button', { name: /menu/i }))
  expect((await screen.findAllByText('visitor mode')).length).toBeGreaterThan(0)
  expect(screen.queryByRole('link', { name: 'Open on HomePageAgain' })).toBeNull()
})
