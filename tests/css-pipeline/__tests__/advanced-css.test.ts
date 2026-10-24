/**
 * Your-own-HTML-page (advanced mode) CSS: transformAdvancedCss is the one
 * transform the live page and the editor preview both use. These pin what
 * a pasted Neocities stylesheet needs: root selectors that stay roots, #id
 * rules that find the prefixed ids, and nothing reaching the site chrome.
 */
import fs from 'fs'
import path from 'path'
import {
  prefixUserContentIds,
  scopeAdvancedSelector,
  transformAdvancedCss,
  namePageLayers,
  moveWholePageEffects,
  PAGE_ROOT,
  SITE_CHROME_SELECTOR,
  SITE_LAYER_ORDER,
} from '@/lib/utils/css/css-transform'

const ROOT = path.join(__dirname, '..', '..', '..')
const SCOPE_OPEN = `@scope (html) to (${SITE_CHROME_SELECTOR}) {`

/** The CSS a sadgrl-style page carries in its <style> block. */
function sadgrlCss(): string {
  const page = fs.readFileSync(path.join(ROOT, 'tests/template-engine/corpus/sadgrl-layout.html'), 'utf8')
  return page.match(/<style>([\s\S]*?)<\/style>/)![1]
}

describe('scopeAdvancedSelector: root selectors stay roots', () => {
  test.each([
    ['body', ':scope body'],
    ['body.dark', ':scope body.dark'],
    ['body > .wrap', ':scope body > .wrap'],
    ['BODY', ':scope BODY'],
    ['html', ':scope:root'],
    [':root', ':scope:root'],
    ['html:root', ':scope:root'],
    [':root .x', ':scope:root .x'],
    ['html body .x', ':scope:root body .x'],
    ['*', ':scope body *'],
    ['*::before', ':scope body *::before'],
    ['.layout', ':scope body .layout'],
    ['nav ul li a:hover::before', ':scope body nav ul li a:hover::before'],
    ['::selection', ':scope:root::selection, :scope body ::selection'],
  ])('%s → %s', (input, expected) => {
    expect(scopeAdvancedSelector(input)).toBe(expected)
  })

  test('a body-ish class or element name is not mistaken for the root', () => {
    expect(scopeAdvancedSelector('.body')).toBe(':scope body .body')
    expect(scopeAdvancedSelector('html-viewer')).toBe(':scope body html-viewer')
    expect(scopeAdvancedSelector('bodytext')).toBe(':scope body bodytext')
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
  test('wraps rules in the site-chrome donut and hoists what @scope cannot hold', () => {
    const out = transformAdvancedCss(
      `@import url("https://fonts.googleapis.com/css2?family=VT323");
       @font-face { font-family: X; src: url(x.woff2); }
       @keyframes spin { from { transform: rotate(0) } to { transform: rotate(1turn) } }
       h1::after { content: " *" }`
    )
    const scopeAt = out.indexOf(SCOPE_OPEN)
    expect(out.indexOf(SITE_LAYER_ORDER)).toBe(0)
    expect(out.indexOf('@import')).toBe(SITE_LAYER_ORDER.length + 1)
    expect(out.indexOf('@font-face')).toBeLessThan(scopeAt)
    expect(out.indexOf('@keyframes')).toBeLessThan(scopeAt)
    // keyframe stops are not selectors
    expect(out).toContain('from { transform: rotate(0) }')
    expect(out).not.toContain(':scope body from')
    expect(out.slice(scopeAt)).toContain(':scope body h1::after {')
  })

  test('font imports from a pasted <head> come first, without duplicates', () => {
    const line = '@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");'
    const out = transformAdvancedCss(`${line}\n.a { color: red }`, {
      fontImports: [line, '@import url("https://fonts.googleapis.com/css2?family=Space+Mono");'],
    })
    expect(out.split(line).length - 1).toBe(1)
    expect(out.indexOf('Space+Mono')).toBeLessThan(out.indexOf(SCOPE_OPEN))
  })

  test('font imports alone still produce CSS (a page with no <style>)', () => {
    const line = '@import url("https://fonts.googleapis.com/css2?family=VT323");'
    expect(transformAdvancedCss('', { fontImports: [line] })).toBe(`${SITE_LAYER_ORDER}\n${line}`)
    expect(transformAdvancedCss('')).toBe('')
  })

  test('@media rules are scoped and boosted like top-level ones', () => {
    const out = transformAdvancedCss('@media (max-width: 800px) { body { margin: 0 } .layout { width: 100% } }')
    expect(out).toContain(':scope body {')
    expect(out).toContain(':scope body .layout {')
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
    const rootRule = out.match(/:scope:root \{([^}]*)\}/)
    expect(rootRule).not.toBeNull()
    expect(rootRule![1]).toContain('--sidebar-width: 200px')
    expect(rootRule![1]).toContain('--header-bg-color: #FDA4BA')
  })

  test('body background and font apply to the page body', () => {
    expect(out).toMatch(/:scope body \{[^}]*background-color: #08031A/)
  })

  test('element rules for header, nav and footer stay inside the chrome donut', () => {
    const inside = out.slice(out.indexOf(SCOPE_OPEN))
    for (const sel of [':scope body header {', ':scope body nav {', ':scope body footer {', ':scope body a {']) {
      expect(inside).toContain(sel)
    }
    // the only rule outside the scope is the @font-face
    expect(out.slice(SITE_LAYER_ORDER.length, out.indexOf(SCOPE_OPEN)).trim()).toMatch(/^@font-face \{[^}]*\}$/)
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
    const guard = chrome.match(/@layer threadstead-browser \{\s*\.profile-template-root \{([^}]*)\}/)?.[1] ?? ''
    for (const decl of ['isolation: isolate !important', 'position: static !important', 'z-index: auto !important']) {
      expect(guard).toContain(decl)
    }
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
    expect(app).toMatch(/id="advanced-template-css"[\s\S]{0,400}transformAdvancedCss\(/)
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
    expect(out).toContain(':scope body .card {')
    expect(out).toContain('#user-content-title { color: red }')
    expect(out).not.toContain(':scope body #user-content-title')
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
    expect(transformAdvancedCss('@media print { body { visibility: hidden } }')).toContain(':scope body .profile-template-root { visibility: hidden; }')
  })

  test("overlays on body::before are the page root's", () => {
    expect(scopeAdvancedSelector('body::before')).toBe(':scope body .profile-template-root::before')
    expect(scopeAdvancedSelector('html::after')).toBe(':scope body .profile-template-root::after')
  })

  test("only data-site-chrome is the site's: a page's own class=\"site-header\" is the page's", () => {
    expect(SITE_CHROME_SELECTOR).toBe('[data-site-chrome]')
    const marked = ['components/ui/navigation/NavBar.tsx', 'components/ui/navigation/SiteFooter.tsx', 'components/ui/layout/CustomPageLayout.tsx',
      'components/core/profile/ViewSourceBadge.tsx', 'contexts/ToastContext.tsx', 'components/features/templates/NavigationPreview.tsx']
    for (const file of marked) expect(fs.readFileSync(path.join(ROOT, file), 'utf8')).toContain('data-site-chrome')
  })

  test("the chrome doesn't inherit visibility, word-break or the page's --spacing", () => {
    const globals = fs.readFileSync(path.join(ROOT, 'styles/globals.css'), 'utf8')
    const reset = globals.match(/\.site-header, \.site-footer, \[data-site-chrome\] \{([^}]*)\}/)?.[1] ?? ''
    for (const decl of ['visibility: visible', 'word-break: normal', '--spacing: 4px']) expect(reset).toContain(decl)
  })

  test("the page's CSS comes after the site's stylesheets, like the preview's", () => {
    const app = fs.readFileSync(path.join(ROOT, 'pages/_app.tsx'), 'utf8')
    expect(app.indexOf('id="advanced-template-css"')).toBeGreaterThan(app.indexOf('</Head>'))
  })
})
