/**
 * RetroTV, CRTMonitor and Boombox are 350–600px wide. On a phone they made
 * the whole page wider than the screen, so it zoomed out (template audit
 * 06 bug 7, 09). They now shrink to the page instead.
 */
import React from 'react'
import { render } from '@testing-library/react'
import RetroTV from '../RetroTV'
import CRTMonitor from '../CRTMonitor'
import Boombox from '../Boombox'

test.each([
  ['RetroTV', RetroTV],
  ['CRTMonitor', CRTMonitor],
  ['Boombox', Boombox],
])('%s is never wider than the page', (_name, Component) => {
  const { container } = render(<Component />)
  expect((container.firstElementChild as HTMLElement).style.maxWidth).toBe('100%')
})

test("CRTMonitor's screen keeps its shape as it shrinks", () => {
  const { container } = render(<CRTMonitor />)
  const screen = container.firstElementChild!.firstElementChild as HTMLElement
  expect(screen.style.maxWidth).toBe('100%')
  expect(screen.style.aspectRatio).toBe('4 / 3')
})
