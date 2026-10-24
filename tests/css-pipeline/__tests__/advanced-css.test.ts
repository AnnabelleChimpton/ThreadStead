/**
 * Your-own-HTML-page (advanced mode) CSS: transformAdvancedCss is the one
 * transform the live page and the editor preview both use. These pin what
 * a pasted Neocities stylesheet needs: root selectors that stay roots, #id
 * rules that find the prefixed ids, and nothing reaching the site chrome.
 */
import fs from 'fs'
import { parse, type Selector } from 'css-what'
import path from 'path'
import {
  prefixUserContentIds,
  scopeAdvancedSelector,
  transformAdvancedCss,
  namePageLayers,
  moveWholePageEffects,
  renameCollidingKeyframes,
  SITE_KEYFRAMES,
  PAGE_ROOT,
  SITE_CHROME_SELECTOR,
  SITE_LAYER_ORDER,
} from '@/lib/utils/css/css-transform'

const ROOT = path.join(__dirname, '..', '..', '..')

/** The CSS a sadgrl-style page carries in its <style> block. */
function sadgrlCss(): string {
  const page = fs.readFileSync(path.join(ROOT, 'tests/template-engine/corpus/sadgrl-layout.html'), 'utf8')
  return page.match(/<style>([\s\S]*?)<\/style>/)![1]
}

describe('scopeAdvancedSelector: root selectors stay roots', () => {
  test.each([
    ['body', ':root:is(html) body'],
    ['body.dark', ':root:is(html) body:has(:where(.profile-template-root).dark)'],
    ['body > .wrap', ':root:is(html) body :where(.profile-template-root) > .wrap'],
    ['BODY', ':root:is(html) BODY'],
    ['html', 'html:root:is(html)'],
    [':root', ':root:root:is(html)'],
    ['html:root', 'html:root:is(html):root'],
    [':root .x', ':root:root:is(html) :where(.profile-template-root) .x'],
    ['html body .x', 'html:root:is(html) body :where(.profile-template-root) .x'],
    ['*', ':root body :where(.profile-template-root) *'],
    ['*::before', ':root body :where(.profile-template-root) *::before'],
    ['.layout', ':root body :where(.profile-template-root) .layout'],
    ['nav ul li a:hover::before', ':root body :where(.profile-template-root) nav ul li a:hover::before'],
    ['::selection', ':root::selection, :root body :where(.profile-template-root) ::selection'],
  ])('%s → %s', (input, expected) => {
    expect(scopeAdvancedSelector(input)).toBe(expected)
  })

  // Template audit 01 #9: in a browser `body .nav a` beats a later `.nav a`,
  // and `:root` beats `html`; scoping must not change who wins
  test('every selector gains the same weight, one class and one element', () => {
    const larger = (a: number[], b: number[]) => ((a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) >= 0 ? a : b)
    const weightOf = (lists: Selector[][]): number[] =>
      lists.map((tokens) => tokens.reduce((sum, t) => {
        const w = t.type === 'tag' || t.type === 'pseudo-element' ? [0, 0, 1]
          : t.type === 'attribute' ? (t.name === 'id' && t.action === 'equals' ? [1, 0, 0] : [0, 1, 0])
          : t.type === 'pseudo' ? (Array.isArray(t.data) ? (t.name === 'where' ? [0, 0, 0] : weightOf(t.data)) : [0, 1, 0])
          : [0, 0, 0]
        return sum.map((n, i) => n + w[i])
      }, [0, 0, 0])).reduce(larger)
    const weight = (selector: string) => weightOf(parse(selector))
    for (const sel of ['body .nav a', '.nav a', 'html', ':root', 'html body .x', 'body', 'a:hover', '#main p', 'ul > li + li', 'body.dark .x', 'body.dark', 'html[data-theme="dark"]']) {
      const [a, b, c] = weight(sel)
      expect(weight(scopeAdvancedSelector(sel))).toEqual([a, b + 1, c + 1])
    }
  })

  // Template audit 02 X2: a page raised .ts-page-frame (or any div:has() around
  // its root) and sat over the site's nav
  test("the page's selectors only reach its own HTML, never the site's wrappers", () => {
    for (const sel of ['.ts-page-frame', 'div:has(.profile-template-root)', '#__next', 'body > div', 'html div', '*']) {
      expect(scopeAdvancedSelector(sel)).toContain(':where(.profile-template-root) ')
    }
    // `body > header` is the page's top level, as its author meant
    expect(scopeAdvancedSelector('body > header')).toBe(':root:is(html) body :where(.profile-template-root) > header')
    expect(scopeAdvancedSelector('body.dark .x')).toBe(':root:is(html) body :where(.profile-template-root).dark .x')
  })

  // Template audit 02 R7, 03 F8a: a pasted page's <body class="dark"> goes on
  // the page root (document-head.ts), and its CSS follows it there
  test("classes and attributes on html or body are the page root's; pseudo-classes stay", () => {
    expect(scopeAdvancedSelector('body.dark .x')).toBe(':root:is(html) body :where(.profile-template-root).dark .x')
    expect(scopeAdvancedSelector('html[data-theme="dark"] a')).toBe('html:root:is(html) :where(.profile-template-root)[data-theme="dark"] a')
    // the rule still paints the real body, when the root has the class
    expect(scopeAdvancedSelector('body.dark')).toBe(':root:is(html) body:has(:where(.profile-template-root).dark)')
    expect(scopeAdvancedSelector('body:has(#d:checked) .x')).toBe(':root:is(html) body:has(#d:checked) :where(.profile-template-root) .x')
  })

  test('a whole-page effect behind a condition moves with it (template audit 10 #1)', () => {
    const out = transformAdvancedCss('html:has(#dark:checked) { filter: invert(1); background: black }')
    expect(out).toContain('html:root:is(html):has(#user-content-dark:checked) { background: black; }')
    expect(out).toContain('html:root:is(html):has(#user-content-dark:checked) .profile-template-root { filter: invert(1); }')
  })

  test('a body-ish class or element name is not mistaken for the root', () => {
    expect(scopeAdvancedSelector('.body')).toBe(':root body :where(.profile-template-root) .body')
    expect(scopeAdvancedSelector('html-viewer')).toBe(':root body :where(.profile-template-root) html-viewer')
    expect(scopeAdvancedSelector('bodytext')).toBe(':root body :where(.profile-template-root) bodytext')
  })
})

describe('prefixUserContentIds', () => {
  test('#id selectors point at the prefixed ids, wherever they sit in the selector', () => {
    expect(prefixUserContentIds('#container { a: b }')).toContain('#user-content-container {')
    expect(prefixUserContentIds('div#a.b > #c:not(#d) { a: b }')).toContain(
      'div#user-content-a.b > #user-content-c:not(#user-content-d) {'
    )
  })

  test('already-prefixed ids, attribute selectors and colours are left alone', () => {
    const out = prefixUserContentIds('#user-content-x, a[href="#top"] { color: #fff; background: #000 }')
    expect(out).toContain('#user-content-x, a[href="#top"] {')
    expect(out).toContain('color: #fff')
    expect(out).not.toContain('user-content-user-content')
  })

  test('url(#id) references (SVG filters, gradients) follow the prefix', () => {
    const out = prefixUserContentIds('.blurry { filter: url(#blur); fill: url("#grad") }')
    expect(out).toContain('url(#user-content-blur)')
    expect(out).toContain('url("#user-content-grad")')
  })

  test('ids inside @media are prefixed too', () => {
    expect(prefixUserContentIds('@media (max-width: 800px) { #sidebar { display: none } }')).toContain(
      '#user-content-sidebar'
    )
  })
})

describe('transformAdvancedCss', () => {
  test('no @scope block (Safari before 17.4 drops it whole); imports first, the rest as written', () => {
    const out = transformAdvancedCss(
      `@import url("https://fonts.googleapis.com/css2?family=VT323");
       @font-face { font-family: X; src: url(x.woff2); }
       @keyframes spin { from { transform: rotate(0) } to { transform: rotate(1turn) } }
       h1::after { content: " *" }`
    )
    expect(out).not.toContain('@scope')
    expect(out.indexOf(SITE_LAYER_ORDER)).toBe(0)
    expect(out.indexOf('@import')).toBe(SITE_LAYER_ORDER.length + 1)
    expect(out.indexOf('@font-face')).toBeLessThan(out.indexOf('@keyframes'))
    // keyframe stops are not selectors
    expect(out).toContain('from { transform: rotate(0) }')
    expect(out).not.toContain(':root body :where(.profile-template-root) from')
    expect(out).toContain(':root body :where(.profile-template-root) h1::after {')
  })

  test('font imports from a pasted <head> come first, without duplicates', () => {
    const line = '@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");'
    const out = transformAdvancedCss(`${line}\n.a { color: red }`, {
      fontImports: [line, '@import url("https://fonts.googleapis.com/css2?family=Space+Mono");'],
    })
    expect(out.split(line).length - 1).toBe(1)
    expect(out.indexOf('Space+Mono')).toBeLessThan(out.indexOf('.a {'))
  })

  test('font imports alone still produce CSS (a page with no <style>)', () => {
    const line = '@import url("https://fonts.googleapis.com/css2?family=VT323");'
    expect(transformAdvancedCss('', { fontImports: [line] })).toBe(`${SITE_LAYER_ORDER}\n${line}`)
    expect(transformAdvancedCss('')).toBe('')
  })

  test('@media rules are scoped and boosted like top-level ones', () => {
    const out = transformAdvancedCss('@media (max-width: 800px) { body { margin: 0 } .layout { width: 100% } }')
    expect(out).toContain(':root:is(html) body {')
    expect(out).toContain(':root body :where(.profile-template-root) .layout {')
  })
})

describe('golden: the sadgrl layout stylesheet', () => {
  const out = transformAdvancedCss(sadgrlCss())

  test('no dead root selectors (html body body, html body :root)', () => {
    expect(out).not.toMatch(/body\s+body/)
    expect(out).not.toMatch(/body\s+:root/)
    expect(out).not.toMatch(/body\s+html/)
  })

  test(':root custom properties land on the root, so every var() resolves', () => {
    const rootRule = out.match(/:root:root:is\(html\) \{([^}]*)\}/)
    expect(rootRule).not.toBeNull()
    expect(rootRule![1]).toContain('--sidebar-width: 200px')
    expect(rootRule![1]).toContain('--header-bg-color: #FDA4BA')
  })

  test('body background and font apply to the page body', () => {
    expect(out).toMatch(/:root:is\(html\) body \{[^}]*background-color: #08031A/)
  })

  test('element rules for header, nav and footer stay inside the page root', () => {
    for (const sel of [':root body :where(.profile-template-root) header {', ':root body :where(.profile-template-root) nav {', ':root body :where(.profile-template-root) footer {', ':root body :where(.profile-template-root) a {']) {
      expect(out).toContain(sel)
    }
  })
})

describe("the page's own layers can't join the site's", () => {
  test('page layers go into threadstead-page, the last layer', () => {
    expect(namePageLayers('@layer base, theme;')).toBe('@layer threadstead-page.base, threadstead-page.theme;')
    const out = namePageLayers('@layer theme { a { color: red } } @media (min-width: 1px) { @layer { b { color: blue } } }')
    expect(out).toContain('@layer threadstead-page.theme {')
    expect(out).toContain('@layer threadstead-page {')
    expect(out).not.toMatch(/@layer theme\b/)
  })

  test('layers nested in a page layer keep their names', () => {
    expect(namePageLayers('@layer a { @layer b { p { color: red } } }')).toContain('@layer b {')
  })

  test('the transform states the same layer order as styles/globals.css', () => {
    const globals = fs.readFileSync(path.join(ROOT, 'styles/globals.css'), 'utf8')
    expect(globals.match(/^@layer theme,[^;]*;/m)?.[0]).toBe(SITE_LAYER_ORDER)
    expect(SITE_LAYER_ORDER.trim().endsWith('threadstead-page;')).toBe(true)
  })

  test("the page root's stacking guard is !important in the site's first layer", () => {
    // Nothing a page's CSS says, !important included, can lift its root over the nav
    const chrome = fs.readFileSync(path.join(ROOT, 'styles/chrome-layers.css'), 'utf8')
    const block = chrome.match(/\/\* -+ the page can't cover chrome[\s\S]*?@layer threadstead-browser \{([\s\S]*?)\n\}/)?.[1] ?? ''
    const rule = (selector: string) => block.match(new RegExp(`${selector.replace(/[[\].]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? ''
    // display too: display: contents took the root's box, and its stacking context (02 X2)
    for (const decl of ['display: block !important', 'isolation: isolate !important']) expect(rule('[data-template-root]')).toContain(decl)
    for (const decl of ['position: static !important', 'z-index: auto !important']) expect(rule('.profile-template-root')).toContain(decl)
    const renderer = fs.readFileSync(path.join(ROOT, 'components/core/profile/AdvancedProfileRenderer.tsx'), 'utf8')
    expect(renderer).not.toMatch(/isolation:\s*'auto'/)
  })
})

describe('preview equals live', () => {
  // Both injection sites must run the same transform; a second, raw
  // injection is how the preview used to show pages the live site didn't.
  const app = fs.readFileSync(path.join(ROOT, 'pages/_app.tsx'), 'utf8')
  const preview = fs.readFileSync(path.join(ROOT, 'pages/template-preview.tsx'), 'utf8')

  test('the live advanced-CSS block and the preview both call transformAdvancedCss', () => {
    expect(app).toMatch(/advancedPage\) \{[\s\S]{0,300}transformAdvancedCss\(/)
    expect(app).toMatch(/'advanced-template-css'/)
    expect(preview).toMatch(/transformAdvancedCss\(/)
    expect(preview).toMatch(/id="advanced-template-css"/)
  })

  test('no hand-rolled html body boost is left in _app.tsx', () => {
    expect(app).not.toMatch(/`html body \$\{/)
  })
})

describe("a page of your own HTML gets the browser's html and body", () => {
  // The exemptions named .user-profile-page, which nothing ever set: html was
  // painted cream and body one screen tall, so a dark page turned
  // light-on-cream below the first screen (template audit 02 R3, 13 #5)
  const css = ['styles/globals.css', 'styles/retro.css'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')

  test('no html or body rule waits on the class nothing sets', () => {
    expect(css).not.toMatch(/(?:html|body):not\(\.user-profile-page\)/)
  })

  test('the height, light-mode and phone background rules skip own-HTML pages', () => {
    expect(css).toMatch(/html:not\(:has\(\.profile-template-root\)\), body:not\(:has\(\.profile-template-root\)\) \{ height: 100%; \}/)
    expect(css.match(/html:not\(:has\(\.profile-template-root\)\)/g)!.length).toBeGreaterThanOrEqual(3)
    expect(css).not.toMatch(/^html, body \{ height: 100%; \}/m)
  })
})

describe('CSS nesting: #id rules inside other rules find the renamed ids', () => {
  // Nested rules kept #title, which matches nothing on the page (template audit 05, 10)
  test('nested at any depth, with declarations and nested @media left as written', () => {
    const out = prefixUserContentIds(
      '.card { color: red; background: url("a;b.png"); #title { margin: 0; & #sub:hover { color: blue } } @media (width < 40em) { #title { margin: 1px } } }'
    )
    expect(out).toContain('color: red; background: url("a;b.png");')
    expect(out).toContain('#user-content-title { margin: 0;')
    expect(out).toContain('& #user-content-sub:hover { color: blue }')
    expect(out).toContain('@media (width < 40em) { #user-content-title { margin: 1px } }')
    expect(out).not.toMatch(/#title|#sub/)
  })

  test('nested selectors are not scoped (they are relative to their parent)', () => {
    const out = transformAdvancedCss('.card { #title { color: red } }')
    expect(out).toContain(':root body :where(.profile-template-root) .card {')
    expect(out).toContain('#user-content-title { color: red }')
    expect(out).not.toContain(':root body :where(.profile-template-root) #user-content-title')
  })
})

describe('page defaults and printing', () => {
  const chrome = fs.readFileSync(path.join(ROOT, 'styles/chrome-layers.css'), 'utf8')
  const defaults = fs.readFileSync(path.join(ROOT, 'styles/page-defaults.css'), 'utf8')

  test("printing a page of your own HTML leaves the site's chrome off the paper (template audit 09)", () => {
    expect(chrome).toMatch(/@media print \{[\s\S]*body:has\(\.profile-template-root\) \[data-site-chrome\] \{\s*display: none !important;/)
  })

  test("<blink> blinks, in the site's first layer, and not for reduced motion (template audit 15)", () => {
    expect(defaults).toMatch(/^@layer threadstead-browser \{/m)
    expect(defaults).toMatch(/\[data-template-root\] blink \{\s*animation: ts-blink/)
    expect(defaults).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*blink \{\s*animation: none;/)
  })
})

describe("the page's CSS stays off the site's chrome", () => {
  // template audit 03 #5 #6, 10 #1 #3 #4
  test('whole-page effects on html or body go on the page root; the rest stays', () => {
    const out = moveWholePageEffects('body { background: black; filter: sepia(1); transform: rotate(1deg) } html { opacity: .9 } p { filter: blur(1px) }')
    expect(out).toContain('body { background: black; }')
    expect(out).toContain(`${PAGE_ROOT} { filter: sepia(1); transform: rotate(1deg); }`)
    expect(out).toContain(`${PAGE_ROOT} { opacity: .9; }`)
    expect(out).toContain('p { filter: blur(1px) }')
    // Inside @media too, and through the whole transform
    expect(transformAdvancedCss('@media print { body { visibility: hidden } }')).toContain(':root body .profile-template-root { visibility: hidden; }')
  })

  test("overlays on body::before are the page root's", () => {
    expect(scopeAdvancedSelector('body::before')).toBe(':root body .profile-template-root::before')
    expect(scopeAdvancedSelector('html::after')).toBe(':root body .profile-template-root::after')
  })

  test("only data-site-chrome is the site's: a page's own class=\"site-header\" is the page's", () => {
    expect(SITE_CHROME_SELECTOR).toBe('[data-site-chrome]')
    const marked = ['components/ui/navigation/NavBar.tsx', 'components/ui/navigation/SiteFooter.tsx', 'components/ui/layout/CustomPageLayout.tsx',
      'components/core/profile/ViewSourceBadge.tsx', 'contexts/ToastContext.tsx', 'components/features/templates/NavigationPreview.tsx']
    for (const file of marked) expect(fs.readFileSync(path.join(ROOT, file), 'utf8')).toContain('data-site-chrome')
  })

  test("the chrome doesn't inherit visibility, word-break or the page's --spacing", () => {
    const globals = fs.readFileSync(path.join(ROOT, 'styles/globals.css'), 'utf8')
    const reset = globals.match(/\.site-footer[^,{]*, \[data-site-chrome\] \{([^}]*)\}/)?.[1] ?? ''
    for (const decl of ['visibility: visible', 'word-break: normal', '--spacing: 4px', 'direction: ltr', 'cursor: auto', '--text-sm: 14px', '--radius-lg: 8px']) {
      expect(reset).toContain(decl)
    }
  })

  test("the page's CSS comes after the site's, before the page, like the preview's", () => {
    const app = fs.readFileSync(path.join(ROOT, 'pages/_app.tsx'), 'utf8')
    const pageStyle = app.indexOf("'advanced-template-css'")
    expect(pageStyle).toBeGreaterThan(app.indexOf('</Head>'))
    expect(pageStyle).toBeGreaterThan(app.indexOf('{isProfilePage && siteCssStyle}'))
    expect(pageStyle).toBeLessThan(app.indexOf('<Component {...pageProps} />'))
    const preview = fs.readFileSync(path.join(ROOT, 'pages/template-preview.tsx'), 'utf8')
    expect(preview.indexOf('id="advanced-template-css"')).toBeGreaterThan(preview.indexOf('id="preview-site-css"'))
  })
})

// Template audit 01 #16e: a page's @keyframes spin replaced the site's, nav spinner included
describe('keyframes the site uses too', () => {
  test("the page's own is renamed, with its uses; names it only uses keep the site's", () => {
    const out = renameCollidingKeyframes('@keyframes spin { to { rotate: 1turn } } .a { animation: spin 2s infinite } .b { animation-name: spin } .c { animation: pulse 1s } @keyframes mine {} .d { animation: mine 1s }')
    expect(out).toContain('@keyframes page-spin')
    expect(out).toContain('.a { animation: page-spin 2s infinite }')
    expect(out).toContain('.b { animation-name: page-spin }')
    expect(out).toContain('.c { animation: pulse 1s }')
    expect(out).toContain('.d { animation: mine 1s }')
  })

  test('the list holds every @keyframes the site defines', () => {
    const files = [...fs.readdirSync(path.join(ROOT, 'styles')).filter((f) => f.endsWith('.css')).map((f) => path.join(ROOT, 'styles', f)),
      path.join(ROOT, 'node_modules/tailwindcss/theme.css')]
    const names = new Set(files.flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1])))
    expect([...names].filter((name) => !SITE_KEYFRAMES.has(name))).toEqual([])
  })
})
