import React, { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import EditorSheet, { type SheetSnap } from '../EditorSheet'
import { installPointerEvents } from './pointer-events'

beforeAll(installPointerEvents)

const heights = { peek: 168, fit: 400, full: 560 }

function Harness() {
  const [snap, setSnap] = useState<SheetSnap>('fit')
  return (
    <EditorSheet heights={heights} snap={snap} onSnapChange={setSnap}>
      <p>palette</p>
    </EditorSheet>
  )
}

const sheet = () => screen.getByText('palette').parentElement!.parentElement as HTMLElement
const handle = () => screen.getByRole('button')

test('a tap steps through the sizes', () => {
  render(<Harness />)
  expect(sheet().style.height).toBe('400px')
  fireEvent.click(handle())
  expect(sheet().style.height).toBe('560px')
  fireEvent.click(handle())
  expect(sheet().style.height).toBe('168px')
  expect(handle()).toHaveAccessibleName('Show more of the palette')
})

test('a drag follows the finger, then snaps to the nearest size without also stepping', () => {
  render(<Harness />)
  fireEvent.pointerDown(handle(), { clientY: 500, pointerId: 1 })
  fireEvent.pointerMove(handle(), { clientY: 380 })
  expect(sheet().style.height).toBe('520px')
  fireEvent.pointerUp(handle(), { clientY: 380 })
  fireEvent.click(handle())
  expect(sheet().style.height).toBe('560px')
})

test('it never grows past full or shrinks past peek', () => {
  render(<Harness />)
  fireEvent.pointerDown(handle(), { clientY: 500, pointerId: 1 })
  fireEvent.pointerMove(handle(), { clientY: -400 })
  expect(sheet().style.height).toBe('560px')
  fireEvent.pointerMove(handle(), { clientY: 2000 })
  expect(sheet().style.height).toBe('168px')
})
