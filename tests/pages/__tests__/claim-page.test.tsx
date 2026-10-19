/**
 * /claim/[code]: after a claim, "Go to Pixel Home" used to point at
 * /pixel-home (a 404), and every button was a <Link><a>, which Next 15
 * refuses to render.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/router', () => ({ useRouter: () => ({ query: { code: 'SPRING' } }) }))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))

import ClaimPage from '@/pages/claim/[code]'

const info = {
  decoration: { itemId: 'i1', name: 'Tulip', type: 'plant', category: 'plants', description: 'A tulip' },
  status: 'available',
  statusMessage: null,
  availability: {
    totalClaims: 0, maxClaims: null, remainingClaims: null,
    releaseStartAt: null, releaseEndAt: null, isLimitedTime: false,
  },
}

beforeEach(() => {
  ;(global as any).fetch = jest.fn(async (url: string, init?: RequestInit) => ({
    ok: true,
    json: async () => (init?.method === 'POST' ? { success: true } : info),
  }))
})

it('after claiming, links to your own pixel home', async () => {
  render(<ClaimPage isAuthenticated userId="u1" username="annie" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Claim Decoration' }))
  const link = await screen.findByRole('link', { name: 'Go to Pixel Home' })
  expect(link).toHaveAttribute('href', '/home/annie')
  expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/')
})

it('signed out, offers sign-in as a plain link', async () => {
  render(<ClaimPage isAuthenticated={false} userId={null} username={null} />)
  expect(await screen.findByRole('link', { name: 'Sign In to Claim' })).toHaveAttribute('href', '/login')
})
