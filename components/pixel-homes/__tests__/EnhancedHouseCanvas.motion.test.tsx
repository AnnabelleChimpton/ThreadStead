/**
 * Motion in the scene (art-direction T7, T9): sprites appear with a 1-pixel
 * hop, no blurred shadows on the art, and at most three frame strips play.
 */
import React from 'react'
import { render } from '@testing-library/react'
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data'

jest.mock('../HouseSVG', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => <svg data-house="" className={`house-svg ${className ?? ''}`} />,
}))
jest.mock('../DecorationSVG', () => ({
  __esModule: true,
  default: ({ decorationId, animate, className }: { decorationId: string; animate?: boolean; className?: string }) => (
    <span data-art={decorationId} data-animate={animate ? 'yes' : 'no'} className={className} />
  ),
}))

import EnhancedHouseCanvas from '../EnhancedHouseCanvas'

beforeAll(() => {
  ;(global as any).ResizeObserver = class { observe() {} disconnect() {} }
})

const strip = (id: string, frames = 3): DecorationItem => ({
  id: `${id}_row`, decorationId: id, name: id, type: 'water', position: { x: 32, y: 240 },
  pngUrl: `https://cdn.test/${id}.png`, pngWidth: 16, pngHeight: 16, pngFrames: frames,
})

test('only the first three strips play; stills and the rest hold still', () => {
  const decorations = [strip('a'), strip('still', 1), strip('b'), strip('c'), strip('d')]
  const { container } = render(<EnhancedHouseCanvas template="cabin_v1" palette="thread_sage" decorations={decorations} />)
  const animate = Object.fromEntries([...container.querySelectorAll('[data-art]')].map((el) => [el.getAttribute('data-art'), el.getAttribute('data-animate')]))
  expect(animate).toEqual({ a: 'yes', still: 'no', b: 'yes', c: 'yes', d: 'no' })
})

test('sprites hop into place; no blurred drop-shadows on the art or the house', () => {
  const { container } = render(<EnhancedHouseCanvas template="cabin_v1" palette="thread_sage" decorations={[strip('a')]} />)
  const art = container.querySelector('[data-art="a"]')!
  expect(art.closest('.ts-pixel-hop')).not.toBeNull()
  expect(container.innerHTML).not.toMatch(/drop-shadow/)
  expect(container.querySelector('[data-house]')!.getAttribute('class')).toContain('house-svg')
})
