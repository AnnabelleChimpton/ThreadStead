/**
 * Nicknames ("iframe" for Embed) come after the real names that match
 * what's typed: <If and Enter gave <Embed, <sec gave <RevealBox (bug bash
 * 2026-10-26). Checked with CodeMirror's own completion list.
 */
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { autocompletion, currentCompletions, startCompletion } from '@codemirror/autocomplete'
import { html as htmlLang, htmlLanguage } from '@codemirror/lang-html'
import { buildExtraTags, nicknameCompletionsFor } from '../component-autocomplete'
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { buildComponentDocs } from '@/lib/templates-docs/component-docs'

async function firstFor(typed: string): Promise<string | undefined> {
  const schemas = buildComponentDocs(componentRegistry.getAllRegistrations())
  const view = new EditorView({
    state: EditorState.create({
      doc: typed,
      selection: { anchor: typed.length },
      extensions: [htmlLang({ extraTags: buildExtraTags(schemas) }), htmlLanguage.data.of({ autocomplete: nicknameCompletionsFor(schemas.map((c) => c.name)) }), autocompletion({ activateOnTypingDelay: 0 })],
    }),
    parent: document.body,
  })
  startCompletion(view)
  for (let waited = 0; currentCompletions(view.state).length === 0 && waited < 1000; waited += 10) await new Promise((r) => setTimeout(r, 10))
  const first = currentCompletions(view.state)[0]?.label
  view.destroy()
  return first
}

test.each([
  ['<If', 'If'],
  ['<sec', 'section'],
  ['<vid', 'video'],
  ['<ifr', 'Embed'],
])('%s offers %s first', async (typed, expected) => {
  expect(await firstFor(typed)).toBe(expected)
})

// look="plain" on components with a box (lib/templates/styling/component-parts.ts), not on ones without
test.each([
  ['<Button lo', 'look'],
  ['<Guestbook lo', 'look'],
  ['<Button look="', 'plain'],
  ['<Var lo', undefined],
])('%s completes to %s', async (typed, expected) => {
  expect(await firstFor(typed)).toBe(expected)
})
