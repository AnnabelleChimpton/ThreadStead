/**
 * A page's CSS can't reach the site's chrome, however it's written. Each
 * case here got out in the bug bash (2026-10-26, P0 #2): the transform read
 * the CSS with its own scanners, and where they disagreed with the browser
 * (a missing }, a string broken by a line break, an escaped name, an
 * unquoted url) the browser found a rule the transform never scoped.
 *
 * So these don't check the output with those scanners. They read it with a
 * spec tokenizer (@csstools/css-tokenizer, as a browser tokenizes) and
 * split it into rules as a browser does, then check every rule a browser
 * would apply stays inside the page.
 */
import { tokenize, stringify, type CSSToken } from '@csstools/css-tokenizer'
import {
  PAGE_ROOT,
  SITE_FONTS,
  renameSiteFonts,
  scopeAwayFromSiteChrome,
  transformAdvancedCss,
} from '@/lib/utils/css/css-transform'
import { normalizeCss } from '@/lib/utils/css/css-normalize'
import { advancedPageStyles } from '@/lib/templates/rendering/page-css'
import fs from 'fs'
import path from 'path'

interface BrowserRule {
  /** The at-rules it sits in, as written: '@media screen', '@scope (…)' */
  inside: string[]
  selector: string
  block: string
  /** Its properties as the browser reads them (escapes undone), and those of rules nested in it that aren't inside the page */
  properties: string[]
}

/** A token as the tokenizer gives it: type, text, start, end, and what it holds (a name's value, escapes undone) */
type Token = [string, string, number, number, { value?: unknown } | undefined]
const tokensOf = (css: string) => tokenize({ css }) as unknown as Token[]
const text = (tokens: Token[]) => stringify(...(tokens as unknown as CSSToken[]))

const OPENS: Record<string, string> = { '(-token': ')-token', '[-token': ']-token', '{-token': '}-token', 'function-token': ')-token' }

/** From an opening token: the index just past its block (only its own closer ends it, as in a browser) */
function pastBlock(tokens: Token[], start: number): number {
  const closers = [OPENS[tokens[start][0]]]
  let i = start + 1
  while (i < tokens.length && closers.length > 0) {
    const type = tokens[i][0]
    if (type === closers[closers.length - 1]) closers.pop()
    else if (OPENS[type]) closers.push(OPENS[type])
    else if (type === 'EOF-token') break
    i++
  }
  return i
}

/** Style rules as a browser's "consume a stylesheet" finds them, into the at-rules that hold rules */
function browserRules(css: string, tokens: Token[] = tokensOf(css), inside: string[] = []): BrowserRule[] {
  const rules: BrowserRule[] = []
  let i = 0
  while (i < tokens.length && tokens[i][0] !== 'EOF-token') {
    const type = tokens[i][0]
    if (type === 'whitespace-token' || type === 'comment-token' || type === 'CDO-token' || type === 'CDC-token') {
      i++
      continue
    }
    const start = i
    while (i < tokens.length && tokens[i][0] !== 'EOF-token' && tokens[i][0] !== '{-token' && !(type === 'at-keyword-token' && tokens[i][0] === 'semicolon-token')) {
      i = OPENS[tokens[i][0]] ? pastBlock(tokens, i) : i + 1
    }
    const prelude = text(tokens.slice(start, i)).trim()
    if (tokens[i]?.[0] !== '{-token') {
      i++ // a statement at-rule, or a rule with no block (dropped)
      continue
    }
    const end = pastBlock(tokens, i)
    const block = tokens.slice(i + 1, end - 1)
    if (type === 'at-keyword-token') {
      const name = String(tokens[start][4]?.value).toLowerCase()
      if (['media', 'supports', 'container', 'layer', 'scope', 'starting-style', 'document', '-moz-document'].includes(name)) {
        rules.push(...browserRules('', [...block, ['EOF-token', '', -1, -1, undefined]], [...inside, prelude]))
      }
    } else {
      rules.push({ inside, selector: prelude, block: text(block), properties: propertiesIn(block) })
    }
    i = end
  }
  return rules
}

/** Declared property names in a block, by the tokenizer's own reading, into nested rules that aren't the page's */
function propertiesIn(block: Token[]): string[] {
  const names: string[] = []
  let statement = 0
  for (let i = 0; i < block.length; ) {
    const type = block[i][0]
    if (type === 'semicolon-token') {
      statement = ++i
    } else if (type === '{-token') {
      const end = pastBlock(block, i)
      if (!text(block.slice(statement, i)).includes(PAGE_ROOT)) names.push(...propertiesIn(block.slice(i + 1, end - 1)))
      i = statement = end
    } else if (type === 'ident-token' && i === statement + block.slice(statement, i).filter((t) => t[0] === 'whitespace-token').length) {
      let next = i + 1
      while (block[next]?.[0] === 'whitespace-token') next++
      if (block[next]?.[0] === 'colon-token') names.push(String(block[i][4]?.value).toLowerCase())
      i = OPENS[type] ? pastBlock(block, i) : i + 1
    } else {
      i = OPENS[type] ? pastBlock(block, i) : i + 1
    }
  }
  return names
}

/** The roots of `@scope (a, b) to (c)`, or none when it has none */
function scopeRoots(prelude: string): string[] {
  const open = /^@scope\s*\(/i.exec(prelude)
  if (!open) return []
  let depth = 0
  for (let i = open[0].length - 1; i < prelude.length; i++) {
    if (prelude[i] === '(') depth++
    if (prelude[i] === ')' && --depth === 0) return selectorList(prelude.slice(open[0].length, i))
  }
  return []
}

/** Split on top-level commas */
function selectorList(selector: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else current += ch
  }
  return [...parts, current.trim()].filter(Boolean)
}

/** html or body itself, as scopeAdvancedSelector writes it: `:root:is(html)`, then maybe ` body`, with only conditions on them */
const WHOLE_DOCUMENT = /^(?:html|:root)?:root:is\(html\)(?:[:.#[][^\s]*)?(?: body(?:[:.#[](?:[^\s(]|\([^)]*\))*)?)?$/

/** What hides, moves or blurs the nav when it's on html or body */
const EFFECTS = /^(?:-webkit-|-moz-)?(?:filter|backdrop-filter|transform|translate|rotate|scale|perspective|zoom|contain|will-change|visibility|opacity|clip-path|mask(?:-[\w-]+)?|content-visibility|writing-mode|animation(?:-[\w-]+)?|offset(?:-[\w-]+)?)$/

/** Every rule a browser applies stays in the page (or is html or body with nothing that reaches the nav) */
function expectContained(css: string) {
  const problems: string[] = []
  for (const rule of browserRules(css)) {
    for (const scope of rule.inside.filter((at) => /^@scope/i.test(at))) {
      const roots = scopeRoots(scope)
      if (roots.length === 0 || roots.some((root) => !root.includes(PAGE_ROOT))) problems.push(`${scope} reaches past the page`)
    }
    if (rule.inside.some((at) => /^@scope/i.test(at))) continue // relative to that root
    for (const selector of selectorList(rule.selector)) {
      if (selector.includes(PAGE_ROOT)) continue
      if (!WHOLE_DOCUMENT.test(selector)) problems.push(`"${selector}" isn't inside the page`)
      else if (rule.properties.some((name) => EFFECTS.test(name)) || /(?:^|[;{\s])display\s*:\s*none/i.test(rule.block)) problems.push(`"${selector} {${rule.block}}" reaches the nav`)
    }
  }
  expect(problems).toEqual([])
}

const page = (css: string) => advancedPageStyles(css, { mode: 'advanced', staticHTML: '' }).css

describe("page CSS can't get out of the page, however it's written", () => {
  test.each([
    ['a missing last }', 'p{color:green} a{font-size:30px;font-family:"Comic Sans MS"'],
    ['an unclosed ( in the last rule', 'p { color: rgb(1, 2 } nav { color: red }'],
    ['a string broken by a line break', '.x { content: "abc\n} nav { color: red } .y { b: " }'],
    ['an escaped quote', '.x { a: \\" } nav { color: red } .y { b: " }'],
    ['a quote inside an unquoted url()', '.x { background: url(x"y) } nav { color: red } .z { b: " }'],
    ['an escaped }', '.x { a: b\\} nav { color: red }'],
    ['a stray }', '} nav { color: red }'],
    ['an unclosed [', '.x { a: [x } nav { color: red }'],
    ['a comment', '/* } */ nav { color: red } /* {'],
    ['escaped @media', '@\\6d edia screen { nav { color: red } }'],
    ['escaped @supports', '@\\73 upports (color: red) { nav { color: red } }'],
    ['@scope (html)', '@scope (html) { nav { color: red } }'],
    ['@scope (body)', '@scope (body) { nav a { color: red } }'],
    ['@scope (:root, .card)', '@scope (:root, .card) { nav { color: red } }'],
    ['a bare @scope', '@scope { nav { color: red } }'],
    ['@scope with only a limit', '@scope to (.x) { nav { color: red } }'],
    ['@scope in @media', '@media screen { @scope (html) { nav { color: red } } }'],
    ['escaped property names on body', 'body { tr\\61 nsform: rotate(5deg); opa\\63 ity: .1; z-inde\\78: 99999 }'],
    ['an effect next to a nested rule', 'body { color: red; .x { color: blue } filter: blur(2px) }'],
    ['an effect in &:hover', 'body { &:hover { opacity: 0 } }'],
    ['an effect in nested @media', 'body { @media screen { visibility: hidden } }'],
    ['an effect in body nested in html', 'html { body { transform: scale(.5) } }'],
    ['clip-path', 'body { clip-path: inset(0 0 100% 0) }'],
    ['mask-image', 'body { mask-image: linear-gradient(transparent, transparent) }'],
    ['-webkit-mask', 'body { -webkit-mask: linear-gradient(transparent, transparent) }'],
    ['content-visibility', 'body { content-visibility: hidden }'],
    ['writing-mode', 'html { writing-mode: vertical-rl }'],
    ['-webkit-transform', 'body { -webkit-transform: rotate(90deg) }'],
    ['an animation', '@keyframes away { to { transform: translateY(-100vh) } } body { animation: away 1s forwards }'],
    ['a motion path', 'body { offset-path: path("M0,0 L0,-500") }'],
    ['display: none', 'html { display: none } body { display:none !important }'],
    ['display: none nested', 'body { &.x { display: none } }'],
  ])('%s', (_, css) => {
    expectContained(page(css))
    expectContained(transformAdvancedCss(css))
  })

  test('the oracle catches what got out before', () => {
    // As the transform used to emit them: unscoped, as the browser reads it
    expect(() => expectContained('p { } a{font-size:30px')).toThrow()
    expect(() => expectContained('.x { content: "abc\n} nav { color: red }')).toThrow()
    expect(() => expectContained('@scope (:root:is(html)) { nav { color: red } }')).toThrow()
    expect(() => expectContained(':root:is(html) body { filter: blur(2px) }')).toThrow()
  })

  test('a missing last } closes as the browser closes it: the rule still applies, in the page', () => {
    const out = page('p{color:green} a{font-size:30px')
    expect(out).toContain(':root body :where(.profile-template-root) a {font-size:30px}')
  })

  test('escaped names are read plainly, so the layer and @import checks see them', () => {
    expect(page('@\\6c ayer theme { p { color: red } }')).toContain('@layer threadstead-page.theme')
    const imported = page('@\\69 mport url(https://example.com/x.css); p { color: red }')
    expect(imported).not.toMatch(/@import|example\.com/)
    expect(page('p { -webkit-text-secur\\69 ty: disc }')).not.toContain('-webkit-text-security')
  })

  test('effects move to the page root, with their conditions', () => {
    expect(page('body { &:hover { opacity: 0 } }')).toContain(':root:is(html) body:hover .profile-template-root { opacity: 0; }')
    expect(page('body { color: red; .x { color: blue } filter: blur(2px) }')).toContain(`:root body ${PAGE_ROOT} { filter: blur(2px); }`)
    expect(page('body { @media screen { visibility: hidden } }')).toMatch(/@media screen \{\s*:root body \.profile-template-root \{ visibility: hidden; \}/)
  })

  test('other display values on body stay on body (centring a page with flex works as before)', () => {
    expect(page('body { display: flex; justify-content: center }')).toContain(':root:is(html) body { display: flex; justify-content: center }')
  })

  test('nested rules without effects are left as they were', () => {
    expect(page('body { &:hover { color: red } }')).toContain(':root:is(html) body { &:hover { color: red } }')
  })

  test('the standard layout: every rule stays off the chrome, and an escaped z-index is still clamped', () => {
    const out = scopeAwayFromSiteChrome('.x { z-inde\\78: 99999 } p{color:green} a{font-size:30px')
    expect(out).toContain('z-index: min(99999, 9998)')
    for (const rule of browserRules(out)) {
      for (const selector of selectorList(rule.selector)) expect(selector).toContain(':not([data-site-chrome]')
    }
  })
})

describe('normalizeCss', () => {
  test.each([
    ['comments go', 'a /* x */ { b: c }', 'a  { b: c }'],
    ['a string ends at a line break', 'a { content: "x\nb: c }', 'a { content: "x"\nb: c }'],
    ['an escaped line break carries a string on', 'a { content: "x\\\ny" }', 'a { content: "x\\\ny" }'],
    ['letters are written plainly', '@\\6d edia x { tr\\61 nsform\\3a  y }', '@media x { transform\\3a  y }'],
    ['- where it can be, not where it would start a number', '\\2d \\2d x: \\2d 5', '--x: \\2d 5'],
    ['digits inside a name, not at its start', '.a\\31  .\\31 a', '.a1 .\\31 a'],
    ['a brace that closes nothing is escaped', '} a { b: c) }', '\\7d  a { b: c\\29  }'],
    ['what is left open is closed', 'a { b: f(x [y', 'a { b: f(x [y])}'],
    ['a bad url is thrown away, as the browser does', 'a { b: url(x"y) c }', 'a { b: url(about:invalid) c }'],
    ['a good one stays', 'a { b: url( x.png ) }', 'a { b: url(x.png) }'],
    ['url("…") is a string', 'a { b: url( "x)y" ) }', 'a { b: url( "x)y" ) }'],
  ])('%s', (_, input, expected) => {
    expect(normalizeCss(input)).toBe(expected)
  })

  test('running it twice changes nothing', () => {
    const samples = ['@\\6d edia x { a\\31  { b: "c\n} } \\2d 5 url(x"y) ) ] [', 'a{b:c', '.\\31 23 { --\\78: \\2d 1 }']
    for (const css of samples) expect(normalizeCss(normalizeCss(css))).toBe(normalizeCss(css))
  })

  test('ordinary CSS comes out as it went in', () => {
    const css = '@import url("https://fonts.googleapis.com/css2?family=A;B");\n@media (width < 40em) { .a > b:hover::after { content: "\\201C"; background: url(data:image/png;base64,AAA=) } }'
    expect(normalizeCss(css)).toBe(css)
    // The same class, in the one way escapes are written
    expect(normalizeCss('.md\\:flex { color: red !important }')).toBe('.md\\3a flex { color: red !important }')
  })
})

describe("the site's fonts", () => {
  test("a page's @font-face of a font the site uses is renamed, with its uses", () => {
    const out = renameSiteFonts('@font-face { font-family: Georgia; src: local("Comic Sans MS") } h1 { font-family: Georgia, serif } p { font: 12px/1.5 "Times New Roman", Georgia } @font-face { font-family: "Mine" } i { font-family: Mine, Georgia }')
    expect(out).toContain('@font-face { font-family: "page-Georgia";')
    expect(out).toContain('h1 { font-family: "page-Georgia", serif }')
    expect(out).toContain('p { font: 12px/1.5 "Times New Roman", "page-Georgia" }')
    expect(out).toContain('font-family: "Mine"')
    expect(out).toContain('i { font-family: Mine, "page-Georgia" }')
  })

  test('through the whole transform', () => {
    expect(page('@font-face{font-family:"Segoe UI";src:local(x)} p{font-family:"Segoe UI"}')).toContain('font-family:"page-Segoe UI"')
  })

  test('the list holds every font the site is set in', () => {
    const ROOT = path.join(__dirname, '..', '..', '..')
    const files = [...fs.readdirSync(path.join(ROOT, 'styles')).filter((f) => f.endsWith('.css')).map((f) => path.join(ROOT, 'styles', f)),
      path.join(ROOT, 'node_modules/tailwindcss/theme.css')]
    const GENERIC = /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong|inherit|initial|unset)$/i
    const families = files.flatMap((f) =>
      [...fs.readFileSync(f, 'utf8').matchAll(/(?:font-family|--font-[\w-]+|--default-[\w-]*font-family)\s*:\s*([^;}]+)/g)]
        .flatMap((m) => m[1].replace(/--theme\(\s*--[\w-]+\s*,|var\([^)]*\)|!important|\)\s*$/g, '').split(','))
        .map((name) => name.trim().replace(/^(["'])(.*)\1$/, '$2').toLowerCase())
        .filter((name) => name && !GENERIC.test(name) && !/^--|^\d|initial|\)/.test(name))
    )
    expect([...new Set(families)].filter((name) => !SITE_FONTS.has(name))).toEqual([])
  })
})

describe('rendering fixes from the bug bash (2026-10-26)', () => {
  test('a space inside :has(), :not() or [attr="a b"] keeps html and body selectors whole', () => {
    expect(page(':root:has(.theme-switch input:checked) { --bg: #111 }')).toContain(':root:root:is(html):has(.theme-switch input:checked) { --bg: #111 }')
    expect(page('body:has(nav .open) .x { color: red }')).toContain(':root:is(html) body:has(nav .open) :where(.profile-template-root) .x { color: red }')
    expect(page('html:not([data-theme="light dark"]) .x { color: red }')).toContain(':not([data-theme="light dark"])')
    // The dark-mode switch's whole-page effect still goes on the page root
    expect(page('html:has(#dark input:checked) { filter: invert(1) }')).toContain('.profile-template-root { filter: invert(1); }')
    expectContained(page('html:has(#dark input:checked) { filter: invert(1) } body:has(nav .open) nav { color: red }'))
  })

  test('[id=…], [for=…] and usemap follow the renamed ids, with or without a # elsewhere; ends-with and contains stay as written', () => {
    const out = page('[id="main"] { color: red } label[for=x] { color: red } [id$="-box"] { color: red } [id*="nav"] { color: red } img[usemap="#m"] { border: 0 }')
    expect(out).toContain('[id="user-content-main"]')
    expect(out).toContain('[for="user-content-x"]')
    expect(out).toContain('[id$="-box"]')
    expect(out).toContain('[id*="nav"]')
    expect(out).toContain('[usemap="#user-content-m"]')
  })

  test("the phone-only form rules keep off a page's own selects and fields", () => {
    const css = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'styles/components.css'), 'utf8')
    const outsidePages = ':where(:not([data-template-root] *))'
    for (const rule of ['select', 'select:focus-visible', 'input:focus-visible', '.error-message', '.field-invalid', '.field-valid']) {
      const [name, state = ''] = rule.split(/(?=:focus)/)
      expect(css).toContain(`${name}${outsidePages}${state}`)
    }
    expect(css).not.toMatch(/^\s*select \{/m)
  })
})
