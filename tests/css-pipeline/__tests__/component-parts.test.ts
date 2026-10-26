/**
 * Parts and tokens (design/component-styling-audit/PLAN.md): the table in
 * lib/templates/styling/component-parts.ts is where a component's look on
 * a page comes from, with site styles off, and when the page sets tokens.
 */
import fs from 'fs'
import path from 'path'
import { PARTS, TOKENS, componentPartsCssFile, plainLookCss, tokenRulesFor, tokensSetIn } from '@/lib/templates/styling/component-parts'
import { transformAdvancedCss } from '@/lib/utils/css/css-transform'

const ROOT = path.join(__dirname, '..', '..', '..')

test('styles/component-parts.css is what the table writes (run scripts/write-component-parts-css.ts)', () => {
  expect(fs.readFileSync(path.join(ROOT, 'styles/component-parts.css'), 'utf8')).toBe(componentPartsCssFile())
})

test('it loads after the stylesheets whose classes it overrides, and after components.css comes again', () => {
  const globals = fs.readFileSync(path.join(ROOT, 'styles/globals.css'), 'utf8')
  expect(globals.indexOf('component-parts.css')).toBeGreaterThan(globals.indexOf('retro.css'))
  expect(globals.indexOf('component-parts.css')).toBeGreaterThan(globals.indexOf('theme-parts.css'))
  const app = fs.readFileSync(path.join(ROOT, 'pages/_app.tsx'), 'utf8')
  expect(app.indexOf('styles/component-parts.css')).toBeGreaterThan(app.indexOf('styles/components.css'))
})

test("every part's class is on its component", () => {
  const sources = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full)
    return /\.tsx?$/.test(entry.name) ? [fs.readFileSync(full, 'utf8')] : []
  })
  const code = sources(path.join(ROOT, 'components')).join('\n')
  const missing = [...new Set(PARTS.map((part) => part.part))].filter((name) => !new RegExp(`[\\s"'\`]${name}[\\s"'\`]`).test(code))
  expect(missing).toEqual([])
})

test('every declaration reads only known tokens', () => {
  const unknown = PARTS.flatMap((part) => Object.values(part.declarations ?? {}).flatMap((value) => [...value.matchAll(/--ts-[\w-]+/g)].map((m) => m[0])))
    .filter((token) => !(token in TOKENS))
  expect(unknown).toEqual([])
})

describe('a page that sets a token', () => {
  test('gets the declarations reading it, and only those', () => {
    const rules = tokenRulesFor(tokensSetIn(':root { --ts-card: #eee }'), ':root body :where(.profile-template-root)')
    expect(rules).toContain(':root body :where(.profile-template-root) .ts-card { background: var(--ts-card, transparent); }')
    expect(rules).not.toContain('--ts-edge')
    expect(rules).not.toContain('color: var(--ts-ink)')
  })

  test("they come ahead of the page's own rules, so a rule on a part still wins", () => {
    const out = transformAdvancedCss(':root { --ts-card: #eee } .ts-card { background: red }')
    const token = out.indexOf('.ts-card { background: var(--ts-card')
    const own = out.indexOf('.ts-card { background: red }')
    expect(token).toBeGreaterThan(-1)
    expect(own).toBeGreaterThan(token)
  })

  test("a page that sets none gets none, and a name that isn't a token doesn't count", () => {
    expect(transformAdvancedCss('p { color: red }')).not.toContain('.ts-card')
    expect(tokensSetIn(':root { --ts-cards: red; --my-colour: blue }').size).toBe(0)
  })
})

describe('look="plain"', () => {
  const css = plainLookCss()
  const rule = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)))

  test('turns the tokens off for the component and those inside it', () => {
    expect(rule('ts-island[data-look="plain"]')).toContain('--ts-card: transparent')
    expect(rule('ts-island[data-look="plain"]')).toContain('--ts-shadow: none')
  })

  test('a button loses its frame and padding, and keeps its focus ring', () => {
    const button = rule('ts-island[data-look="plain"] .ts-button')
    expect(button).toContain('border-width: 0')
    expect(button).toContain('padding: 0')
    expect(button).not.toContain('outline')
  })

  test('a card loses its box and the outline the site draws inside it, and keeps its padding', () => {
    const card = rule('ts-island[data-look="plain"] .ts-card')
    expect(card).toContain('background: none')
    expect(card).toContain('outline-color: transparent')
    expect(card).not.toContain('padding')
  })

  test('states like the chosen tab keep their marks', () => {
    expect(css).not.toContain('[aria-selected')
  })
})
