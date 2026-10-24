/**
 * Post and guestbook dates hydrate cleanly for visitors in any time zone,
 * then show their own local time (template audit 13 #4).
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from 'react'
import LocalTime from '../LocalTime'

const ISO = '2026-10-24T03:16:00.000Z'

test('the server shows the date alone, in UTC: the same in every time zone and browser', () => {
  expect(renderToString(<LocalTime iso={ISO} />)).toBe('<time dateTime="2026-10-24T03:16:00.000Z">Oct 24, 2026</time>')
})

test('hydrates without a mismatch, then shows local date and time', async () => {
  const container = document.createElement('div')
  container.innerHTML = renderToString(<LocalTime iso={ISO} />)
  const mismatches: unknown[] = []
  await act(async () => {
    hydrateRoot(container, <LocalTime iso={ISO} />, { onRecoverableError: (error) => mismatches.push(error) })
  })
  expect(mismatches).toEqual([])
  expect(container.textContent).toBe(new Date(ISO).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }))
})
