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

  test('a strip is a Sprite one frame wide, holding still unless the scene lets it play', () => {
    const still = render(<DecorationSVG decorationType="water" decorationId="fountain" pngUrl="https://cdn.test/f.v1.png" pngWidth={32} pngHeight={32} pngFrames={4} />)
    const s = still.container.querySelector('.ts-sprite') as HTMLElement
    expect([s.style.width, s.style.height, s.style.backgroundSize]).toEqual(['32px', '32px', '128px 32px'])
    expect(s.style.animation).toBe('')
    const playing = render(<DecorationSVG decorationType="water" decorationId="fountain" size="large" animate pngUrl="https://cdn.test/f.v1.png" pngWidth={32} pngHeight={32} pngFrames={4} />)
    const p = playing.container.querySelector('.ts-sprite') as HTMLElement
    expect([p.style.width, p.style.backgroundSize]).toEqual(['64px', '256px 64px'])
    expect(p.style.animation).toContain('steps(4, jump-none)')
  })
})
