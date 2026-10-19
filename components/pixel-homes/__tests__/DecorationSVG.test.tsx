import React from 'react'
import { render } from '@testing-library/react'
import DecorationSVG from '../DecorationSVG'

const img = (container: HTMLElement) => container.querySelector('img') as HTMLImageElement

describe('DecorationSVG with a PNG', () => {
  test('renders at the stored size, not the table size', () => {
    const { container } = render(<DecorationSVG decorationType="plant" decorationId="roses_red" pngUrl="https://cdn.test/r.v1.png" pngWidth={24} pngHeight={19} />)
    expect([img(container).width, img(container).height]).toEqual([24, 19])
    expect(img(container).style.objectFit).toBe('')
  })

  test('an older PNG with no stored size keeps the table size', () => {
    const { container } = render(<DecorationSVG decorationType="plant" decorationId="roses_red" pngUrl="https://cdn.test/r.png" />)
    expect([img(container).width, img(container).height]).toEqual([24, 24])
  })

  test('large is exactly 2×', () => {
    const { container } = render(<DecorationSVG decorationType="plant" decorationId="roses_red" size="large" pngUrl="https://cdn.test/r.v1.png" pngWidth={24} pngHeight={19} />)
    expect([img(container).width, img(container).height]).toEqual([48, 38])
  })

  test('a strip shows one frame wide, starting at the first', () => {
    const { container } = render(<DecorationSVG decorationType="water" decorationId="fountain" pngUrl="https://cdn.test/f.v1.png" pngWidth={32} pngHeight={32} pngFrames={4} />)
    expect([img(container).width, img(container).height]).toEqual([32, 32])
    expect(img(container).style.objectFit).toBe('cover')
    expect(img(container).style.objectPosition).toBe('left top')
    expect([img(container).style.width, img(container).style.height]).toEqual(['32px', '32px'])
  })
})
