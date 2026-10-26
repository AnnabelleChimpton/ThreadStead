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

describe('things that silently did nothing now get a word (bug bash 2026-10-26)', () => {
  const says = (source: string) => compileTemplateToArtifacts(source).warnings.join('\n')

  test.each([
    ['<Var name="n" type="number" initial="0" /><Increment var="n" />', '<Increment> only runs inside an event'],
    ['<OnMount><Increment var="n" /></OnMount>\n<Var name="n" type="number" initial="5" />', 'runs before <Var name="n"> on line 2'],
    ['<Var name="d" initial="1" />\n<Var name="d" initial="2" />', 'already a <Var name="d"> on line 1'],
    ['<Var name="n" type="number" initial="abc" />', 'initial needs to be a number'],
    ['<OnKeyPress keyName="space"><Set var="a" value="1" /></OnKeyPress><Var name="a" initial="" />', 'Did you mean keyName=" "?'],
    ['<OnKeyUp keyName="up"><Set var="a" value="1" /></OnKeyUp><Var name="a" initial="" />', 'Did you mean keyName="ArrowUp"?'],
    ['<div id="x">x</div><Var name="on" type="boolean" initial="true" /><ConditionalAttr element="#x" attribute="class" value="big" when="on" />', 'For a class, use <ToggleClass>'],
    ['<Var name="pets" type="array" initial=\'[{"name":"Rex"}]\' /><ul><ForEach var="pets" item="p"><li><ShowVar name="p.name" /></li></ForEach></ul>', 'Write {p.name} in the text'],
    ['<Var name="n" type="computed" expression="n2 ** 2" />', 'Math.pow'],
  ])('%s', (source, expected) => {
    expect(says(source)).toContain(expected)
  })

  test('no "Did you mean i?" for an unknown one-letter name', () => {
    const out = says('<Var name="list" type="array" initial=\'["a"]\' /><ul><ForEach var="list" item="x" index="i"><li><OnClick><Set var="l" value="1" /></OnClick>{x}</li></ForEach></ul>')
    expect(out).toContain('a variable called l')
    expect(out).not.toContain('Did you mean')
  })

  test('what works says nothing', () => {
    expect(says('<Var name="n" type="number" initial="0" /><Button><OnClick><Increment var="n" /></OnClick>+</Button><OnKeyPress keyName=" " scroll="false"><Increment var="n" /></OnKeyPress><OnMount><Set var="n" value="1" /></OnMount>')).toBe('')
  })
})

describe('where browsers take a component apart, the editor says (bug bash 2026-10-26)', () => {
  const says = (source: string) => compileTemplateToArtifacts(source).warnings.join('\n')
  test.each([
    ['<svg viewBox="0 0 9 9"><text>Hi <DisplayName as="span" /></text></svg>', "can't sit inside an <svg>"],
    ['<form action="/x"><Guestbook /></form>', "a form can't sit inside a <form>"],
    ['<button><Button>go</Button></button>', 'inside something clickable'],
    ['<Heading level="2"><h3>Hi</h3></Heading>', 'a heading inside a heading'],
  ])('%s', (source, expected) => {
    expect(says(source)).toContain(expected)
  })
})

test("<body id=\"home\"> reaches the page root, so body#home and #home rules apply", async () => {
  const { pageRootAttributes } = await import('@/lib/templates/compilation/document-head')
  const artifacts = compileTemplateToArtifacts('<!doctype html><html><body id="home" class="night"><h1>Hi</h1></body></html>')
  expect(pageRootAttributes({ ast: artifacts.ast })).toMatchObject({ id: 'home', className: 'night' })
})

test('style="position: sticky; top: 0" sticks below the site nav, like the page CSS does (bug bash 2026-10-26)', async () => {
  const result = await compileForEditor('<div style="position: sticky; top: 0; background: gold">bar</div><div style="position:sticky;top:12px">b</div><p style="top: 0">x</p>')
  const styles = JSON.stringify(result.ok && result.artifact).match(/"style","[^"]*"/g)
  expect(styles).toEqual([
    '"style","position: sticky; top: var(--ts-nav-height, 0px); background: gold"',
    '"style","position:sticky;top:calc(12px + var(--ts-nav-height, 0px))"',
    '"style","top: 0"',
  ])
})

test('@import only counts at the top level: not inside @media, a string or a comment (bug bash 2026-10-26)', () => {
  const { sanitizeCss } = jest.requireActual('@/lib/utils/sanitization/css') as typeof import('@/lib/utils/sanitization/css')
  expect(sanitizeCss('@media print { @import url("https://fonts.googleapis.com/css2?family=Lora"); }').css).not.toMatch(/^@import/)
  expect(sanitizeCss('p::after { content: "@import is cool" } /* @import url(x) */').css).toBe('p::after { content: "@import is cool" } /* @import url(x) */')
  const once = '@import url("https://fonts.googleapis.com/css2?family=Lora");\np { color: red }'
  expect(sanitizeCss(once).css).toBe(once)
})
