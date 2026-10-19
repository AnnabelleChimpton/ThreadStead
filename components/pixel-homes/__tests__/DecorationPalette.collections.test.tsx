/**
 * Seasonal collections in the editor's palette: each collection is its own
 * named group, and a limited item says until when.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
jest.mock('../DecorationIcon', () => ({ __esModule: true, default: ({ id }: { id: string }) => <span data-icon={id} /> }))
jest.mock('../ThemePicker', () => ({ __esModule: true, default: () => null }))
jest.mock('../../../lib/audio/retro-sfx', () => ({ retroSFX: new Proxy({}, { get: () => () => {} }) }))

import DecorationPalette from '../DecorationPalette'

const plant = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: id, type: 'plant', zone: 'front_yard', ...extra }) as any
const items = {
  plants: [
    plant('roses'),
    plant('pumpkin', { collection: 'Autumn 2026', isLimitedTime: true, expiresAt: '2026-11-30T23:59:59.000Z' }),
  ],
  seasonal: [plant('leaf_pile', { collection: 'Autumn 2026', isLimitedTime: true, expiresAt: '2026-11-15T00:00:00.000Z' })],
}

function palette() {
  return render(
    <DecorationPalette
      items={items}
      selectedItem={null}
      onItemSelect={() => {}}
      houseCustomizations={{}}
      onHouseCustomizationChange={() => {}}
      onThemeChange={() => {}}
      currentTemplate="cottage_v1"
      currentPalette="thread_sage"
    />
  )
}

test('a collection is a named tab with its items from any category, and says when it ends', () => {
  palette()
  fireEvent.click(screen.getByRole('tab', { name: 'Autumn 2026' }))
  const tiles = screen.getAllByTitle(/until/)
  expect(tiles.map((t) => t.getAttribute('title'))).toEqual(['pumpkin, until Nov 30', 'leaf_pile, until Nov 15'])
  expect(screen.queryByTitle('roses')).toBeNull()
  expect(screen.getByText('Out until Nov 30.')).toBeTruthy()
})

test('no collections, no extra tabs', () => {
  render(
    <DecorationPalette
      items={{ plants: [plant('roses')] }}
      selectedItem={null}
      onItemSelect={() => {}}
      houseCustomizations={{}}
      onHouseCustomizationChange={() => {}}
      onThemeChange={() => {}}
      currentTemplate="cottage_v1"
      currentPalette="thread_sage"
    />
  )
  expect(screen.queryByRole('tab', { name: /2026/ })).toBeNull()
  expect(screen.getByRole('tab', { name: 'Plants' })).toBeTruthy()
})
