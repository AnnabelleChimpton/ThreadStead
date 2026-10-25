/**
 * The phone menu's account sheet is portalled to body, out of the lg:hidden
 * menu and the header: on a desktop page it sat under everything, "signed
 * in as" and all, and on a page of your own HTML it took the page's fonts.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MobileNavMenu } from '../NavBar'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/', pathname: '/', events: { on: jest.fn(), off: jest.fn() } }) }))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
jest.mock('@/hooks/useNavPages', () => ({ useNavPages: () => ({ pages: [] }) }))
jest.mock('@/hooks/useMe', () => ({
  useMe: () => ({ me: { loggedIn: true, user: { id: 'u1', primaryHandle: 'pat@local' } }, isLoading: false }),
}))

function at(width: number) {
  window.matchMedia = jest.fn((query: string) => ({
    matches: width >= Number(query.match(/min-width: (\d+)px/)?.[1] ?? Infinity),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
  return render(<MobileNavMenu />)
}

describe('MobileNavMenu account sheet', () => {
  it('stays off a desktop page', async () => {
    at(1280)
    await waitFor(() => expect(window.matchMedia).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Close account menu' })).toBeNull()
  })

  it('waits, closed, below the desktop width', async () => {
    at(800)
    const close = await screen.findByRole('button', { name: 'Close account menu' })
    expect(close.closest('.mobile-bottom-sheet')).not.toHaveClass('open')
  })

  it("is the site's chrome, so a page of your own HTML doesn't restyle it", async () => {
    at(375)
    const close = await screen.findByRole('button', { name: 'Close account menu' })
    expect(close.closest('[data-site-chrome]')).toHaveClass('mobile-bottom-sheet')
  })
})
