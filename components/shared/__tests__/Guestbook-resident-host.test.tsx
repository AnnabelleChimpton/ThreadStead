/**
 * On a resident's own address (alice.homepageagain.com) nobody is signed in,
 * so the guestbook is read there and signed on a page of the main site
 * (/act/guestbook/<u>, lib/act/actions.ts), which comes back. A note signed
 * in a pop-up shows when the pop-up says it's done.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { BroadcastChannel as NodeBroadcastChannel } from 'worker_threads'

jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { site_name: 'HomePageAgain', guestbook_prompt: 'Say hi' } }) }))
jest.mock('@/components/shared/ImprovedBadgeDisplay', () => () => null)

import Guestbook from '@/components/shared/Guestbook'
import { ResidentHostProvider } from '@/contexts/ResidentHostContext'

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ entries: [] }) } as Response)) as typeof fetch
})

test('on their own address: a link to sign on the main site and come back, no form', async () => {
  render(
    <ResidentHostProvider value={{ mainSiteUrl: 'https://homepageagain.com', username: 'pigeon' }}>
      <Guestbook username="pigeon" />
    </ResidentHostProvider>
  )
  expect(await screen.findByText("You'll sign on HomePageAgain, then come back here.")).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sign the guestbook (opens HomePageAgain)' })).toHaveAttribute('href', 'https://homepageagain.com/act/guestbook/pigeon')
  expect(screen.queryByRole('textbox')).toBeNull()
})

test('a note signed in a pop-up: the entries are read again', async () => {
  const realChannel = (global as { BroadcastChannel?: unknown }).BroadcastChannel
  ;(global as { BroadcastChannel?: unknown }).BroadcastChannel = NodeBroadcastChannel
  try {
    render(
      <ResidentHostProvider value={{ mainSiteUrl: 'https://homepageagain.com', username: 'pigeon' }}>
        <Guestbook username="pigeon" />
      </ResidentHostProvider>
    )
    await screen.findByText("You'll sign on HomePageAgain, then come back here.")
    const reads = () => (global.fetch as jest.Mock).mock.calls.filter(([u]) => String(u).startsWith('/api/guestbook/')).length
    const before = reads()
    const done = new NodeBroadcastChannel('ts-act')
    await act(async () => {
      done.postMessage({ type: 'act-done', action: 'guestbook', entryId: 'e9' })
      await new Promise((r) => setTimeout(r, 50))
    })
    done.close()
    expect(reads()).toBe(before + 1)
  } finally {
    ;(global as { BroadcastChannel?: unknown }).BroadcastChannel = realChannel
  }
})

test('on the main site: the form, and no note', async () => {
  render(<Guestbook username="pigeon" />)
  expect(await screen.findByRole('textbox')).toBeInTheDocument()
  expect(screen.queryByText(/Signing it happens on/)).toBeNull()
})
