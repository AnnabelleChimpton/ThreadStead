/**
 * Owner notes on the house page (pixel homes Phase 5): a decoration with a
 * note is a button for visitors, nothing is added over the art, and the
 * editor never turns notes into buttons.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data'

jest.mock('../HouseSVG', () => ({ __esModule: true, default: () => null }))
jest.mock('../DecorationSVG', () => ({
  __esModule: true,
  default: ({ decorationId }: { decorationId: string }) => <span data-art={decorationId} />,
}))

import EnhancedHouseCanvas from '../EnhancedHouseCanvas'

beforeAll(() => {
  ;(global as any).ResizeObserver = class { observe() {} disconnect() {} }
})

const item = (id: string, decorationId: string, data?: Record<string, unknown>): DecorationItem => ({
  id,
  decorationId,
  name: 'Thing',
  type: 'plant',
  position: { x: 40, y: 240, layer: 300000 },
  ...(data && { data }),
})
const yard = [
  item('roses_a', 'roses_red', { note: 'For my gran' }),
  item('roses_b', 'roses_red'),
  item('mail_a', 'mailbox', { note: 'ignored' }),
]

function scene(props: Partial<React.ComponentProps<typeof EnhancedHouseCanvas>> = {}) {
  return render(
    <EnhancedHouseCanvas template="cottage_v1" palette="thread_sage" decorations={yard} {...props} />
  )
}

test('only the decoration with a note becomes a button, and clicking it hands that item over', () => {
  const onNoteClick = jest.fn()
  scene({ onNoteClick })
  const buttons = screen.getAllByRole('button', { name: "Read the owner's note" })
  expect(buttons).toHaveLength(1)
  expect(buttons[0].querySelector('[data-art="roses_red"]')).not.toBeNull()
  fireEvent.click(buttons[0])
  expect(onNoteClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'roses_a' }))
})

test('the open note keeps its outline and says it is expanded; nothing else is drawn on the art', () => {
  const { container } = scene({ onNoteClick: jest.fn(), openNoteId: 'roses_a' })
  const button = screen.getByRole('button', { name: "Read the owner's note" })
  expect(button.getAttribute('aria-expanded')).toBe('true')
  expect(button.className).toContain('is-open')
  expect(container.textContent).toBe('')
})

test('the mailbox stays the guestbook even if old data holds a note', () => {
  const onMailboxClick = jest.fn()
  scene({ onNoteClick: jest.fn(), onMailboxClick })
  fireEvent.click(screen.getByRole('button', { name: 'Mailbox (guestbook)' }))
  expect(onMailboxClick).toHaveBeenCalled()
})

test('in the editor, notes are not buttons', () => {
  scene({ onNoteClick: jest.fn(), isDecorationMode: true })
  expect(screen.queryByRole('button', { name: "Read the owner's note" })).toBeNull()
})

test('without a handler (the street, previews) a note changes nothing', () => {
  scene()
  expect(screen.queryByRole('button', { name: "Read the owner's note" })).toBeNull()
})
