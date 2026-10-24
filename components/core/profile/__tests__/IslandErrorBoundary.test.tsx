/**
 * A component that fails leaves its spot empty for visitors (they used to
 * see "Island Error (island-…)") and a plain note for the page's owner.
 */
import React from 'react'
import { render } from '@testing-library/react'
import { IslandErrorBoundary } from '../IslandErrorBoundary'

function Broken(): React.ReactElement {
  throw new Error('boom')
}

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => jest.restoreAllMocks())

test('visitors see nothing where it was', () => {
  const { container } = render(
    <IslandErrorBoundary islandId="island-stickynote-1" component="StickyNote">
      <Broken />
    </IslandErrorBoundary>
  )
  expect(container.textContent).toBe('')
})

test('the owner sees which component, in plain words', () => {
  const { container } = render(
    <IslandErrorBoundary islandId="island-stickynote-1" component="StickyNote" ownerSees>
      <Broken />
    </IslandErrorBoundary>
  )
  expect(container.textContent).toBe("<StickyNote> couldn't show here. Only you see this note.")
  expect(container.textContent).not.toContain('island-')
})
