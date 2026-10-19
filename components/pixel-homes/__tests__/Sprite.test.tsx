import React from 'react'
import { act, render } from '@testing-library/react'
import Sprite from '../Sprite'

let observed: ((entries: { isIntersecting: boolean }[]) => void) | null = null
beforeAll(() => {
  ;(global as any).IntersectionObserver = class {
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { observed = cb }
    observe() {}
    disconnect() {}
  }
})

const el = (c: HTMLElement) => c.querySelector('.ts-sprite') as HTMLElement

test('one frame showing, at a whole-number scale, holding still by default', () => {
  const { container } = render(<Sprite src="/f.png" frameWidth={32} height={24} frames={4} scale={2} />)
  const s = el(container)
  expect([s.style.width, s.style.height]).toEqual(['64px', '48px'])
  expect(s.style.backgroundSize).toBe('256px 48px')
  expect(s.style.backgroundPosition).toBe('0px 0px')
  expect(s.style.animation).toBe('')
})

test('playing steps one whole frame at a time, 200 ms each, never eased', () => {
  const { container } = render(<Sprite src="/f.png" frameWidth={32} height={24} frames={4} playing />)
  expect(el(container).style.animation).toBe('ts-sprite-strip 800ms steps(4, jump-none) infinite')
})

test('pauses while scrolled out of view', () => {
  const { container } = render(<Sprite src="/f.png" frameWidth={16} height={16} frames={2} playing />)
  expect(el(container).style.animationPlayState).toBe('running')
  act(() => observed!([{ isIntersecting: false }]))
  expect(el(container).style.animationPlayState).toBe('paused')
})

test('a single frame never animates', () => {
  const { container } = render(<Sprite src="/f.png" frameWidth={16} height={16} frames={1} playing />)
  expect(el(container).style.animation).toBe('')
})
