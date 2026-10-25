/**
 * A swatch before every colour in the CSS (lib/templates/editor/color-swatches.ts):
 * picking a colour writes it in place, as one edit Undo takes back. A
 * selector like #bad is no colour.
 */
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { css } from '@codemirror/lang-css'
import { ensureSyntaxTree } from '@codemirror/language'
import { history, undo } from '@codemirror/commands'
import { colorSwatches } from '../color-swatches'

beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) })
  // jsdom has no CSS.supports: the names a browser takes as colours
  ;(globalThis as { CSS?: unknown }).CSS = { supports: (_p: string, v: string) => ['red', 'teal'].includes(v.toLowerCase()) }
})

function editor(doc: string) {
  const state = EditorState.create({ doc, extensions: [css(), colorSwatches(), history()] })
  ensureSyntaxTree(state, state.doc.length, 5000)
  return new EditorView({ state, parent: document.body })
}

test('colours get swatches; selectors, keywords and inherit do not', () => {
  const view = editor('#nav { color: #c96633; background: rgb(10, 20, 30); border-color: red; display: block; fill: inherit }')
  view.dispatch({}) // a pass once the tree is there
  const swatches = [...view.dom.querySelectorAll<HTMLElement>('.ts-color-swatch')]
  expect(swatches.map((s) => s.querySelector('input')!.getAttribute('aria-label'))).toEqual(['Change #c96633', 'Change rgb(10, 20, 30)', 'Change red'])
  view.destroy()
})

test("an id the parser takes for a colour (#bad) gets no swatch", () => {
  const view = editor('#bad { color: teal; }')
  view.dispatch({})
  expect(view.dom.querySelector('.ts-color-swatch input')?.getAttribute('aria-label') ?? null).not.toBe('Change #bad')
  view.destroy()
})

test('picking a colour writes it in place of the old, and a drag is one step for Undo', () => {
  const view = editor('h1 { color: #abc; }')
  view.dispatch({})
  const picker = view.dom.querySelector<HTMLInputElement>('.ts-color-swatch input')!
  picker.value = '#123456'
  picker.dispatchEvent(new Event('input'))
  expect(view.state.doc.toString()).toBe('h1 { color: #123456; }')
  // The same swatch is still there for the next pick, at its new length
  picker.value = '#ffffff'
  picker.dispatchEvent(new Event('input'))
  expect(view.state.doc.toString()).toBe('h1 { color: #ffffff; }')
  undo(view)
  expect(view.state.doc.toString()).toBe('h1 { color: #abc; }')
  view.destroy()
})
