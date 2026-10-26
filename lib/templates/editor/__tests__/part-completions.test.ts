/**
 * The CSS pane offers the restyling tokens and the components' parts
 * (lib/templates/editor/part-completions.ts), from the one table in
 * lib/templates/styling/component-parts.ts.
 */
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import { css } from '@codemirror/lang-css'
import { partCompletions } from '../part-completions'
import { TOKENS } from '@/lib/templates/styling/component-parts'

function complete(doc: string) {
  const state = EditorState.create({ doc, extensions: [css()] })
  const result = partCompletions(new CompletionContext(state, doc.length, false))
  return result && { typed: doc.slice(result.from), labels: result.options.map((option) => option.label) }
}

test('--ts offers every token, in a declaration or a var()', () => {
  for (const doc of [':root { --ts', ':root { --ts-ca', '.box { background: var(--ts']) {
    const result = complete(doc)!
    expect(result.labels).toEqual(Object.keys(TOKENS))
    expect(doc.endsWith(result.typed)).toBe(true)
  }
})

test('.ts offers the parts once each, with the component they are in', () => {
  const state = EditorState.create({ doc: '.ts-guest', extensions: [css()] })
  const result = partCompletions(new CompletionContext(state, 9, false))!
  const entry = result.options.find((option) => option.label === '.ts-guestbook-entry')!
  expect(entry.detail).toBe('Guestbook')
  expect(entry.info).toBe('one message')
  const labels = result.options.map((option) => option.label)
  expect(new Set(labels).size).toBe(labels.length)
  expect(labels).toContain('.ts-tabs-tab')
})

test('inside @media too', () => {
  expect(complete('@media (max-width: 600px) {\n  .ts-po')!.labels).toContain('.ts-post')
})

test('nothing for other words', () => {
  expect(complete('.box { color: re')).toBeNull()
  expect(complete('.my-card')).toBeNull()
  expect(complete(':root { --my-colour')).toBeNull()
})
