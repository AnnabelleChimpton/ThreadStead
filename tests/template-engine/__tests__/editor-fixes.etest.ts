/**
 * The editor's side of the bug bash (2026-10-26): what it says, and where.
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))

import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { cleanCss } from '@/lib/utils/sanitization/css'
import { safeOptionColor } from '@/lib/templates/compilation/theme-options'

test('line numbers count blank lines at the top of the page', async () => {
  const result = await compileForEditor('\n\n\n<p>hi</p>\n<ShowVar name="x" />')
  expect(result.ok).toBe(true)
  expect(result.ok && result.warnings.join('\n')).toMatch(/^Line 5: /m)
})

test('saving CSS with a Google Fonts @import again and again adds nothing', () => {
  const css = '@import url("https://fonts.googleapis.com/css2?family=Lora");\n\nbody { color: red }'
  let saved = cleanCss(css)
  for (let n = 0; n < 4; n++) saved = cleanCss(saved)
  expect(saved).toBe(css)
})

test("a colour option's name has to be one of CSS's", () => {
  expect(safeOptionColor('reddish')).toBeUndefined()
  expect(safeOptionColor('RebeccaPurple')).toBe('rebeccapurple')
  expect(safeOptionColor('transparent')).toBe('transparent')
})

test("an OnClick inside a component that doesn't show its insides is said so", () => {
  for (const holder of ['<ShowVar name="n">', '<Guestbook>']) {
    const name = holder.match(/<(\w+)/)![1]
    const { warnings } = compileTemplateToArtifacts(`<Var name="n" type="number" initial="0" /><div>${holder}<OnClick><Increment var="n" /></OnClick></${name}></div>`)
    expect(warnings.join('\n')).toContain(`is inside <${name}>, which doesn't show what's put inside it`)
  }
})

test("a loop's {placeholder} text isn't offered to Words (every change to it was refused)", async () => {
  const source = '<Var name="pets" type="array" initial=\'["cat"]\' />\n<ul><ForEach var="pets" item="p"><li>My pet {p} rocks</li></ForEach></ul>\n<p>Plain words</p>'
  const result = await compileForEditor(source, { positions: true })
  const tree = JSON.stringify(result.ok && result.artifact)
  expect(tree).toMatch(/"t":"p","a":\[\["data-ts-text"/)
  expect(tree).not.toMatch(/"t":"li","a":\[\["data-ts-text"/)
})
