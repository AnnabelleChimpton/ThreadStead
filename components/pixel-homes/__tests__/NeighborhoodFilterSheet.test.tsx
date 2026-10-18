import React from 'react'
import { render, screen } from '@testing-library/react'
import NeighborhoodFilterSheet from '../NeighborhoodFilterSheet'

jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: () => null,
}))

function renderSheet(templates: string[] = []) {
  return render(
    <NeighborhoodFilterSheet
      isOpen
      onClose={() => {}}
      filters={{ activeOnly: false, templates, palettes: [], sortBy: 'recent' }}
      onFiltersChange={() => {}}
      availableTemplates={['loft_v1', 'cottage_v1']}
      availablePalettes={['charcoal_nights']}
      resultCount={2}
      totalCount={2}
    />
  )
}

describe('NeighborhoodFilterSheet', () => {
  it('shows house styles and colors by name, not by stored id', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: 'Loft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cottage' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Charcoal Nights/ })).toBeInTheDocument()
    expect(screen.queryByText('loft_v1')).not.toBeInTheDocument()
    expect(screen.queryByText('charcoal_nights')).not.toBeInTheDocument()
  })

  it('marks the chosen style as pressed', () => {
    renderSheet(['loft_v1'])
    expect(screen.getByRole('button', { name: 'Loft' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cottage' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('offers no shuffled order (a random house is its own link)', () => {
    renderSheet()
    expect(screen.queryByText('Random')).not.toBeInTheDocument()
  })
})
