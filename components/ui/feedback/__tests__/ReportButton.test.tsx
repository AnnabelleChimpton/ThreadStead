/**
 * A report reaches the server: the route checks the CSRF token, and the
 * button sent its request with plain fetch, so every report was refused
 * with a 403.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn(async () => ({ ok: true, json: async () => ({}) })) }))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))

import { csrfFetch } from '@/lib/api/client/csrf-fetch'
import ReportButton from '../ReportButton'

test('sends the report with the CSRF token (csrfFetch), not plain fetch', async () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  const user = userEvent.setup()
  render(<ReportButton reportType="post" targetId="p1" />)
  await user.click(screen.getByRole('button', { name: /report/i }))
  await user.click(screen.getByLabelText(/spam/i))
  await user.click(screen.getByRole('button', { name: /submit/i }))
  await waitFor(() => expect(csrfFetch).toHaveBeenCalledWith('/api/reports/create', expect.objectContaining({ method: 'POST' })))
  expect(JSON.parse((csrfFetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({ reportType: 'post', targetId: 'p1', reason: 'spam' })
  expect(global.fetch).not.toHaveBeenCalled()
})
