/**
 * The editor's "As a visitor" preview shows the FollowButton someone signed
 * out sees. It asked the server, which answered for the page's owner, so
 * the preview showed nothing (bug bash 2026-10-26).
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import FollowButton from '../FollowButton'

jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { site_name: 'Site' } }) }))
jest.mock('@/contexts/ResidentHostContext', () => ({ useResidentHost: () => null }))

test('as a visitor: the signed-out button, without asking the server', async () => {
  const fetchSpy = jest.fn()
  global.fetch = fetchSpy as unknown as typeof fetch
  render(<FollowButton username="pat" asVisitor />)
  expect(await screen.findByText('log in to follow')).toBeInTheDocument()
  expect(fetchSpy).not.toHaveBeenCalled()
})

test('otherwise it asks, as before', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ status: 'owner' }) })) as unknown as typeof fetch
  const { container } = render(<FollowButton username="pat" />)
  expect(global.fetch).toHaveBeenCalledWith('/api/rel/pat')
  // The owner sees no button on their own page
  await waitFor(() => expect(container.textContent).toBe(''))
})
