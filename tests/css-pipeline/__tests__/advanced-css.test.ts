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
