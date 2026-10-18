/**
 * The banner never names a user id: signed-out visitors keep their choice in
 * localStorage only, and signed-in users save through csrfFetch with the
 * route taking the user from the session.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('@/lib/api/client/csrf-fetch', () => ({
  csrfFetch: jest.fn().mockResolvedValue({ ok: true }),
}))

import CookieConsentBanner from '../CookieConsentBanner'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'

const fetchSpy = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  global.fetch = fetchSpy as any
})

test('signed-out visitor: choice stays in localStorage, no server call', async () => {
  render(<CookieConsentBanner />)
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
  await waitFor(() => expect(localStorage.getItem('threadstead-consent-given')).toBe('true'))
  expect(csrfFetch).not.toHaveBeenCalled()
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(screen.queryByRole('region', { name: 'Cookie notice' })).toBeNull()
})

test('signed-in user: saves through csrfFetch without a userId in the URL', async () => {
  render(<CookieConsentBanner userId="user-me" />)
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
  await waitFor(() => expect(csrfFetch).toHaveBeenCalledTimes(1))
  const [url, init] = (csrfFetch as jest.Mock).mock.calls[0]
  expect(url).toBe('/api/consent/manage')
  expect(init.method).toBe('POST')
  expect(fetchSpy).not.toHaveBeenCalled()
})
