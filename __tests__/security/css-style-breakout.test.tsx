/**
 * Profile CSS is written into <style> tags with dangerouslySetInnerHTML, and
 * the HTML parser ends a style element at the first "</style", wherever it
 * sits. These pin the two walls against CSS closing its own tag:
 *  - escapeCssForStyleTag at every injection (protects rows already saved);
 *  - sanitizeCss on every save path (protects what gets stored).
 *
 * Each check renders on the server, parses the HTML back into a DOM and
 * looks for anything outside the style element. The marker is a harmless
 * element, so a failure shows up as an extra node, never as running code.
 *
 * The last block scans the code for <style dangerouslySetInnerHTML> so a new
 * injection can't skip the escape.
 */
import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { cleanCss, escapeCssForStyleTag, sanitizeCss } from '@/lib/utils/sanitization/css'
import { getDefaultProfileTemplate, PROFILE_THEME_IDS } from '@/lib/templates/default-profile-templates'

const MARKER = '<b id="breakout-marker">outside</b>'

// Ways CSS text could carry a closing tag: plainly, in other cases, inside a
// string, inside a url, inside a comment
const CLOSERS = [
  `a{color:red}</style>${MARKER}<style>`,
  `a{color:red}</STYLE >${MARKER}<style>`,
  `a{color:red}</sTyLe\n>${MARKER}`,
  `a{content:"</style>${MARKER}"}`,
  `a{background:url("</style>${MARKER}")}`,
  `/* </style>${MARKER} */ a{color:red}`,
]

function parseServerHTML(html: string): Document {
  return new DOMParser().parseFromString(`<!doctype html><html><head>${html}</head><body></body></html>`, 'text/html')
}

function outsideStyle(doc: Document): string[] {
  const styles = doc.querySelectorAll('style')
  const extras = Array.from(doc.querySelectorAll('head > :not(style), body *')).map((el) => el.outerHTML)
  return styles.length === 1 ? extras : [`${styles.length} style elements`, ...extras]
}

describe('escapeCssForStyleTag', () => {
  test.each(CLOSERS)('keeps %j inside one style element', (css) => {
    const html = renderToString(<style dangerouslySetInnerHTML={{ __html: escapeCssForStyleTag(css) }} />)
    const doc = parseServerHTML(html)
    expect(outsideStyle(doc)).toEqual([])
    expect(doc.getElementById('breakout-marker')).toBeNull()
  })

  test('without it, the same CSS does leave the tag (so the test above means something)', () => {
    const html = renderToString(<style dangerouslySetInnerHTML={{ __html: CLOSERS[0] }} />)
    expect(parseServerHTML(html).getElementById('breakout-marker')).not.toBeNull()
  })

  test('escapes only the < of a closing style tag, as a CSS escape CSS reads as the same character', () => {
    expect(escapeCssForStyleTag('a::after{content:"</style"}')).toBe('a::after{content:"\\3c /style"}')
    expect(escapeCssForStyleTag('a::after{content:"<3"}')).toBe('a::after{content:"<3"}')
    expect(escapeCssForStyleTag('a{color:red}')).toBe('a{color:red}')
    expect(escapeCssForStyleTag(null)).toBe('')
  })

  test('range media queries keep their < (escaped, they never matched: template audit 03 #4)', () => {
    const css = '@media (width < 40em) { .nav { display: none } } @media (400px <= width <= 700px) { a { color: red } }'
    expect(escapeCssForStyleTag(css)).toBe(css)
  })
})

describe('sanitizeCss', () => {
  test.each(CLOSERS)('stores %j with no closing tag in it', (css) => {
    const cleaned = cleanCss(css)
    expect(cleaned).not.toMatch(/<\/style/i)
    // Even placed raw (as an old injection would), it stays inside the tag
    const doc = parseServerHTML(renderToString(<style dangerouslySetInnerHTML={{ __html: cleaned }} />))
    expect(doc.getElementById('breakout-marker')).toBeNull()
  })

  test('takes out a disallowed @import and keeps the rest of the stylesheet', () => {
    const { css, removed } = sanitizeCss(
      '@import url("https://fonts.bunny.net/css?family=pixelify-sans");\nbody { color: plum; }'
    )
    expect(css).not.toContain('@import')
    expect(css).toContain('body { color: plum; }')
    expect(removed).toEqual(['@import from https://fonts.bunny.net/css?family=pixelify-sans (only Google Fonts can be imported)'])
  })

  test('keeps Google Fonts imports, including weights with ";" in the URL, at the top', () => {
    const imp = '@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&display=swap");'
    const { css, removed } = sanitizeCss(`a { color: red; }\n${imp}`)
    expect(css.startsWith(imp)).toBe(true)
    expect(css).toContain('a { color: red; }')
    expect(removed).toEqual([])
  })

  test('leaves scroll-behavior alone (it used to blank the whole stylesheet)', () => {
    expect(cleanCss('html { scroll-behavior: smooth; }')).toBe('html { scroll-behavior: smooth; }')
  })

  test('disables old browser scripting hooks without dropping the rule around them', () => {
    const { css, removed } = sanitizeCss('.a { color: red; width: expression(1); behavior: url(x.htc); background: url("javascript:void 0"); }')
    expect(css).toContain('color: red')
    expect(css).not.toMatch(/expression\s*\(|(?<![\w-])behavior\s*:|javascript:/i)
    expect(removed).toHaveLength(3)
  })

  test.each(PROFILE_THEME_IDS)(
    'the %s preset comes through with nothing removed',
    (preset) => {
      const source = getDefaultProfileTemplate(preset)
      const { css, removed } = sanitizeCss(source)
      expect(removed).toEqual([])
      // Imports move to the top (browsers ignore them anywhere else); the
      // rest is untouched
      const importLine = /^\s*@import.*$/gm // the presets keep each import on its own line
      const withoutImports = (s: string) => s.replace(importLine, '').replace(/\s+/g, '')
      expect(withoutImports(css)).toBe(withoutImports(source))
      expect((css.match(importLine) ?? []).map((l) => l.trim()).sort()).toEqual((source.match(importLine) ?? []).map((l) => l.trim()).sort())
    }
  )
})

describe('every <style dangerouslySetInnerHTML> escapes what it injects', () => {
  // __html expressions known to be escaped where they're built
  const ESCAPED_ELSEWHERE = new Set(['sanitizedCSS'])

  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full)
      return /\.(tsx|ts)$/.test(entry.name) ? [full] : []
    })
  }

  const root = path.resolve(__dirname, '../..')
  const files = ['pages', 'components', 'lib', 'hooks'].flatMap((d) => sourceFiles(path.join(root, d)))
  const injections = files.flatMap((file) => {
    const text = fs.readFileSync(file, 'utf8')
    return [...text.matchAll(/<style\b[^>]*?dangerouslySetInnerHTML=\{\{\s*__html:\s*([\s\S]*?)\}\}\s*\/?>/g)].map((m) => ({
      where: `${path.relative(root, file)}`,
      html: m[1].trim(),
    }))
  })

  test('finds the injections it checks', () => {
    expect(injections.length).toBeGreaterThanOrEqual(5)
  })

  test.each(injections.map((i) => [i.where, i.html]))('%s', (_where, html) => {
    const isEscaped = html.startsWith('escapeCssForStyleTag(')
    const isConstant = /^`[^`]*`$/.test(html) && !html.includes('${')
    const usesOnlyEscaped = /^`[\s\S]*`$/.test(html) &&
      [...html.matchAll(/\$\{\s*([\w.]+)\s*\}/g)].every((m) => ESCAPED_ELSEWHERE.has(m[1]))
    expect(isEscaped || isConstant || ESCAPED_ELSEWHERE.has(html) || usesOnlyEscaped).toBe(true)
  })
})
