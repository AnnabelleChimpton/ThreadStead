/**
 * A page's theme option lines fold to "N page options" with their colours
 * (lib/templates/editor/option-fold.ts); other folds look as before.
 */
import { EditorState, Text } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { foldOptionLines, optionFolding, optionLines } from '../option-fold'

beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) })
})

const PAGE = `<meta name="color:Paper" content="#f7f4ee">
<meta name="color:Ink" content="#1f1c17">
<meta name="font:Text" content="Georgia, serif">
<div class="page">
  <h1>Hi</h1>
</div>`

test('finds the run of option lines, and only a run of two or more', () => {
  const doc = Text.of(PAGE.split('\n'))
  expect(optionLines(doc)).toEqual({ from: 0, to: doc.line(3).to })
  expect(optionLines(Text.of(['<meta name="color:Paper" content="#fff">', '<p>x</p>']))).toBeNull()
  expect(optionLines(Text.of(['<p>no options</p>']))).toBeNull()
})

test('folded, they read "3 page options" with a swatch per colour; a click opens them', () => {
  const view = new EditorView({ state: EditorState.create({ doc: PAGE, extensions: [optionFolding()] }), parent: document.body })
  foldOptionLines(view)
  const folded = view.dom.querySelector('.cm-foldPlaceholder') as HTMLElement
  expect(folded.textContent).toBe('3 page options')
  expect([...folded.querySelectorAll<HTMLElement>('.ts-option-swatch')].map((s) => s.style.background)).toEqual(['rgb(247, 244, 238)', 'rgb(31, 28, 23)'])
  folded.click()
  expect(view.dom.querySelector('.cm-foldPlaceholder')).toBeNull()
  view.destroy()
})

test('option lines that arrive (a starter picked) fold once', async () => {
  const view = new EditorView({ state: EditorState.create({ doc: '', extensions: [optionFolding()] }), parent: document.body })
  view.dispatch({ changes: { from: 0, insert: PAGE } })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(view.dom.querySelector('.cm-foldPlaceholder')?.textContent).toBe('3 page options')
  view.destroy()
})
