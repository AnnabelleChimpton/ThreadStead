/* eslint-disable @next/next/no-html-link-for-pages -- the guard must catch any <a>, including the ones next/link renders */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const router = {
  push: jest.fn(),
  beforePopState: jest.fn(),
  events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}
jest.mock('next/router', () => ({ useRouter: () => router }))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))

import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard'
import { ConfirmProvider } from '@/contexts/ConfirmContext'

function Page({ dirty }: { dirty: boolean }) {
  const { confirmLeave, allowLeave } = useUnsavedChangesGuard(dirty)
  return (
    <>
      <a href="/feed">Feed</a>
      <a href="/feed" target="_blank">Feed in a new tab</a>
      <a href="https://elsewhere.test/">Elsewhere</a>
      <a href="#top">Top</a>
      <button onClick={allowLeave}>Allow</button>
      <button onClick={async () => (document.title = String(await confirmLeave()))}>Ask</button>
    </>
  )
}

const setup = (dirty: boolean) =>
  render(
    <ConfirmProvider>
      <Page dirty={dirty} />
    </ConfirmProvider>
  )

/** Clicks a link and reports whether the browser would follow it. */
function clickLink(name: string, init: MouseEventInit = {}) {
  let followed = false
  // runs after the guard; stops jsdom's own (unimplemented) navigation
  const record = (e: Event) => {
    followed = !e.defaultPrevented
    e.preventDefault()
  }
  document.addEventListener('click', record)
  screen.getByText(name).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
  document.removeEventListener('click', record)
  return followed
}

const lastPopStateCallback = () => router.beforePopState.mock.calls.at(-1)![0]

beforeEach(() => {
  jest.clearAllMocks()
  document.title = ''
})

test('a clean page lets links, Back and tab-close through', () => {
  setup(false)
  expect(clickLink('Feed')).toBe(true)
  expect(lastPopStateCallback()({})).toBe(true)
  const unload = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  expect(unload.defaultPrevented).toBe(false)
})

test('a site link asks first, and only goes on Leave', async () => {
  setup(true)
  expect(clickLink('Feed')).toBe(false)
  expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
  expect(router.push).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/feed'))
})

test('Keep editing stays put', async () => {
  setup(true)
  clickLink('Feed')
  fireEvent.click(await screen.findByText('Keep editing', { selector: 'button' }))
  await waitFor(() => expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument())
  expect(router.push).not.toHaveBeenCalled()
})

test('links that lose nothing are left alone', () => {
  setup(true)
  expect(clickLink('Feed', { metaKey: true })).toBe(true)
  expect(clickLink('Feed', { ctrlKey: true })).toBe(true)
  expect(clickLink('Feed in a new tab')).toBe(true)
  expect(clickLink('Top')).toBe(true)
  // leaving the site is a full page load: the browser's own prompt covers it
  expect(clickLink('Elsewhere')).toBe(true)
  expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
})

test('closing the tab gets the browser prompt', () => {
  setup(true)
  const unload = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  expect(unload.defaultPrevented).toBe(true)
})

test('Back puts the page back and asks', async () => {
  setup(true)
  const pushState = jest.spyOn(window.history, 'pushState')
  expect(lastPopStateCallback()({})).toBe(false)
  expect(pushState.mock.calls[0][2]).toBe('/') // the page's own URL again
  expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
  pushState.mockRestore()
})

test('router.push from code is paused until confirmed', async () => {
  setup(true)
  const onStart = router.events.on.mock.calls.find(([name]) => name === 'routeChangeStart')![1]
  expect(() => onStart('/feed')).toThrow(/unsaved changes/)
  fireEvent.click(await screen.findByRole('button', { name: 'Leave' }))
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/feed'))
  // that push is the confirmed one, so it goes through
  expect(() => onStart('/feed')).not.toThrow()
})

test('allowLeave lets the next navigation through without asking', () => {
  setup(true)
  fireEvent.click(screen.getByText('Allow'))
  expect(clickLink('Feed')).toBe(true)
  expect(lastPopStateCallback()({})).toBe(true)
})

test('confirmLeave asks the same question for an in-page Cancel', async () => {
  setup(true)
  fireEvent.click(screen.getByText('Ask'))
  fireEvent.click(await screen.findByRole('button', { name: 'Leave' }))
  await waitFor(() => expect(document.title).toBe('true'))
})

test('unmounting removes every listener and resets Back', () => {
  const { unmount } = setup(true)
  unmount()
  expect(router.events.off).toHaveBeenCalledWith('routeChangeStart', expect.any(Function))
  expect(lastPopStateCallback()({})).toBe(true)
})
