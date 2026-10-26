/**
 * The public component reference (/build/templates/components): the ones to
 * start with first, every component a click away, each with a snippet and a Copy
 * button. Copy says when it can't (no clipboard outside https), through
 * the site's toasts.
 */
import React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { ToastProvider } from '@/contexts/ToastContext'
import type { ComponentDoc } from '@/lib/templates-docs/component-docs'
import ComponentsPage from '@/pages/build/templates/components'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
jest.mock('@/components/ui/layout/Layout', () => function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
})
// Only getServerSideProps uses these
jest.mock('@/lib/templates/core/template-registry', () => ({ componentRegistry: {} }))
jest.mock('@/lib/templates-docs/componentTutorialMap', () => ({ getCachedTutorialsForComponent: () => [] }))
jest.mock('@/lib/config/site/dynamic', () => ({ getSiteConfig: jest.fn() }))

const doc = (name: string, group: ComponentDoc['group'], example: string): ComponentDoc => ({
  name,
  id: name.toLowerCase(),
  group,
  description: `About ${name}.`,
  example,
  acceptsChildren: false,
  props: [],
})

const components = [
  doc('Guestbook', 'connected', '<h2>Sign my guestbook</h2>\n<Guestbook />'),
  doc('FollowButton', 'connected', '<FollowButton />'),
  doc('Embed', 'layout', '<Embed src="https://youtu.be/jNQXAC9IVRw" />'),
]

function renderPage() {
  return render(
    <ToastProvider>
      <ComponentsPage siteConfig={{ site_name: 'ThreadStead' } as never} components={components} tutorials={{}} />
    </ToastProvider>
  )
}

const realClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
afterEach(() => {
  if (realClipboard) Object.defineProperty(navigator, 'clipboard', realClipboard)
  else delete (navigator as unknown as Record<string, unknown>).clipboard
})

test('it starts with the components to start with, in their own sections', () => {
  renderPage()
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(headings).toEqual(['Your stuff', 'Bits of fun', 'Things people can click', 'Lists, keys and timers', 'Calculations'])
  const entries = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent).filter((t) => t!.startsWith('<'))
  expect(entries).toEqual(['<Guestbook>', '<FollowButton>', '<Embed>'])
})

test('search lists the best match first, in one list, and says how many', () => {
  renderPage()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search components' }), { target: { value: 'follow' } })
  const entries = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
  expect(entries[0]).toBe('<FollowButton>')
  expect(screen.getByText(/match(es)?, best first/)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Calculations' })).toBeNull()
})

test('a few settings show straight away; the CSS ones wait behind More settings', () => {
  const withSettings: ComponentDoc = {
    ...doc('Guestbook', 'connected', '<Guestbook />'),
    props: [
      { name: 'heading', type: 'string', description: 'The title over it.' },
      { name: 'textColor', type: 'string', css: true },
    ] as ComponentDoc['props'],
  }
  render(
    <ToastProvider>
      <ComponentsPage siteConfig={{ site_name: 'ThreadStead' } as never} components={[withSettings]} tutorials={{}} />
    </ToastProvider>
  )
  const entry = document.getElementById('guestbook')!
  expect(within(entry).getByText('The title over it.')).toBeVisible()
  expect(within(entry).getByText('More settings')).toBeInTheDocument()
  expect(within(entry).getByText(/Also takes CSS values as attributes: textColor/)).toBeInTheDocument()
})

test('Show all lists every component, connected ones first', () => {
  renderPage()
  fireEvent.click(screen.getByRole('button', { name: 'Show all 3' }))
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(headings[0]).toBe('Connected to your page')
})

test('Copy puts the snippet on the clipboard', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  renderPage()
  const entry = document.getElementById('guestbook')!
  await act(async () => {
    fireEvent.click(within(entry).getByRole('button', { name: 'Copy the Guestbook snippet' }))
  })
  expect(writeText).toHaveBeenCalledWith('<h2>Sign my guestbook</h2>\n<Guestbook />')
  expect(within(entry).getByRole('button', { name: 'Copy the Guestbook snippet' })).toHaveTextContent('Copied')
})

test("without a clipboard it says so instead of doing nothing", async () => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  renderPage()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy the Embed snippet' }))
  })
  expect(await screen.findByText("Couldn't copy that. Select the snippet and copy it yourself.")).toBeInTheDocument()
})

test('a refused clipboard says so too', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    configurable: true,
  })
  renderPage()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy the FollowButton snippet' }))
  })
  expect(await screen.findByText("Couldn't copy that. Select the snippet and copy it yourself.")).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Copy the FollowButton snippet' })).toHaveTextContent('Copy')
})
