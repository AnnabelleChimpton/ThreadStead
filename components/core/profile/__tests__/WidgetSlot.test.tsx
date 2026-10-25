/**
 * The widget slot on the standard layout renders its stored, compiled
 * fragment with the islands renderer: text first (as the server sends it),
 * then the components hydrate. Real compile pipeline, real registry.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))
// next/dynamic doesn't resolve under jest. The component runtime loads at
// once; the other dynamic component here is ProfileMusic's MidiPlayer (a Web
// Audio synth): stand in for it.
jest.mock('next/dynamic', () => ({
  __esModule: true,
  // The component runtime loads at once (as in Next's server render)
  default: (loader: () => unknown) => String(loader).includes('PageWithComponents') ? jest.requireActual('@/lib/templates/rendering/PageWithComponents').default :
    function MidiPlayerStandIn({ title, placement }: { title?: string; placement?: string }) {
      return (
        <div data-testid="midi-player" data-placement={placement ?? 'floating'}>
          {title}
        </div>
      )
    },
}))

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import WidgetSlot from '../WidgetSlot'
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import { compileWidgetSlot } from '@/lib/domain/profile/widget-slot/compile'
import { checkWidgets, widgetsToSource, type WidgetInstance } from '@/lib/domain/profile/widget-slot/catalog'

function compiled(widgets: Array<Pick<WidgetInstance, 'type'> & { values?: WidgetInstance['values'] }>) {
  const checked = checkWidgets(widgets)
  if (!checked.ok) throw new Error(checked.error)
  const result = compileWidgetSlot(widgetsToSource(checked.widgets))
  if (!result.ok) throw new Error(result.error)
  return { staticHTML: result.staticHTML, islands: result.islands }
}

const owner = { id: 'u_pat', handle: 'pat', displayName: 'Pat', avatarUrl: '/a.png' }
function data(extra: Partial<ResidentData> = {}, viewerId: string | null = null): ResidentData {
  return { owner, viewer: { id: viewerId }, posts: [], guestbook: [], ...extra }
}

test('renders in the standard layout chrome, plain widgets and components alike', async () => {
  const slot = compiled([
    { type: 'sticky', values: { text: 'Hello <there>', colour: 'green', tilt: '0' } },
    { type: 'now', values: { listening: 'chiptunes' } },
  ])
  const { container } = render(<WidgetSlot slot={slot} residentData={data()} />)

  const section = container.querySelector('[data-component="widget-slot"]')!
  expect(section).toHaveClass('thread-module', 'template-card', 'ts-profile-widget-slot')
  // The text is there before anything hydrates, and stays text
  expect(screen.getByText('Hello <there>')).toBeInTheDocument()
  expect(screen.getByText('chiptunes')).toBeInTheDocument()

  // The StickyNote island hydrates into the real component
  await waitFor(() => expect(container.querySelector('.font-handwriting')).not.toBeNull())
  const note = container.querySelector('.font-handwriting') as HTMLElement
  expect(note.style.backgroundColor).toBe('rgb(187, 247, 208)')
  expect(note).toHaveTextContent('Hello <there>')
  expect(container.querySelector('[data-island]')).toBeNull()
})

test('the song widget plays the profile song in the page', async () => {
  const slot = compiled([{ type: 'music' }])
  render(
    <WidgetSlot
      slot={slot}
      residentData={data({ profileMidi: { url: '/api/media/serve/m1', title: 'Little tune' } })}
    />
  )
  const player = await screen.findByTestId('midi-player')
  expect(player).toHaveTextContent('Little tune')
  // In the page, not the floating corner player
  expect(player).toHaveAttribute('data-placement', 'inline')
})

test('without a song, only the owner is told; visitors see nothing', async () => {
  const slot = compiled([{ type: 'music' }])
  const { container, unmount } = render(<WidgetSlot slot={slot} residentData={data({}, 'someone-else')} />)
  await waitFor(() => expect(container.querySelector('[data-island]')).toBeNull())
  expect(screen.queryByText(/No profile song yet/)).toBeNull()
  unmount()

  render(<WidgetSlot slot={slot} residentData={data({}, owner.id)} />)
  expect(await screen.findByText(/No profile song yet/)).toBeInTheDocument()
})

test('the gallery preview drops the card', () => {
  const slot = compiled([{ type: 'marquee', values: { text: 'hi' } }])
  const { container } = render(<WidgetSlot slot={slot} residentData={data()} preview="bare" />)
  expect(container.querySelector('[data-component="widget-slot"]')).toBeNull()
  expect(container.querySelector('marquee')).toHaveTextContent('hi')
})
