/**
 * CopyToClipboard only copies right after the visitor clicked or pressed a
 * key. From OnInterval or OnMouseEnter a page could swap what's on their
 * clipboard without them knowing (bug bash 2026-10-26).
 */
import { executeCopyToClipboardAction } from '../CopyToClipboard'

const copied: string[] = []
let isActive = false

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copied.push(text) } } })
  Object.defineProperty(navigator, 'userActivation', { configurable: true, get: () => ({ isActive }) })
})

const state = {} as Parameters<typeof executeCopyToClipboardAction>[1]

test('no copy without a recent click or key press', async () => {
  isActive = false
  await executeCopyToClipboardAction({ value: 'swapped' }, state)
  expect(copied).toEqual([])
})

test('a copy right after one', async () => {
  isActive = true
  await executeCopyToClipboardAction({ value: 'asked for' }, state)
  expect(copied).toEqual(['asked for'])
})
