/**
 * Theme options, Tumblr-style (design/profile-editing-audit PLAN, Phase 5):
 * `<meta name="color:Accent" content="#c96633">` in a page becomes the CSS
 * variable --color-accent on the page root, and Settings > Your page turns
 * it into a picker that rewrites the content value in the source.
 *
 * Pinned here: what values pass, that nothing a person types (or a tampered
 * stored copy holds) can reach the page's CSS as anything but a value, that
 * the tags never reach the page, that a rewrite only moves the one value,
 * and that the starters declare options without looking any different.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import {
  documentCssFromCompiledTemplate,
  documentHeadCss,
  extractDocument,
} from '@/lib/templates/compilation/document-head'
import {
  optionKey,
  optionVar,
  safeOptionColor,
  safeOptionFont,
  scanThemeOptions,
  themeOptionsCss,
  validThemeOptions,
  writeThemeOptions,
} from '@/lib/templates/compilation/theme-options'
import { HTML_TEMPLATES } from '../fixtures/old-starters/html-templates'
import { STARTERS, splitStarter } from '@/lib/templates/starters'
import { transformAdvancedCss } from '@/lib/utils/css/css-transform'
import { escapeCssForStyleTag } from '@/lib/utils/sanitization/css'

const PAGE = `<meta name="color:Accent" content="#c96633">
<meta name="font:Headings" content="Georgia, serif">
<div class="page">
  <h1>Hi</h1>
</div>`

describe('values', () => {
  test.each(['#fff', '#FFFFFF', '#c9663380', 'rgb(200, 100, 50)', 'rgba(200,100,50,0.5)', 'rgb(200 100 50 / 50%)', 'hsl(20deg 50% 40%)', 'hsla(20, 50%, 40%, .5)', 'Tomato'])(
    'colour %s passes',
    (value) => {
      expect(safeOptionColor(value)).toBeDefined()
    }
  )

  test.each([
    '',
    '#ggg',
    '#12345',
    'red; } body { display: none',
    'red;',
    '#fff}',
    'url(https://evil.example/x.png)',
    'rgb(1,2,3);background:url(x)',
    'expression(alert(1))',
    'var(--x)',
    '</style><script>alert(1)</script>',
    'red\\;',
    'calc(1px)',
  ])('colour %j is refused', (value) => {
    expect(safeOptionColor(value)).toBeUndefined()
  })

  test('colour names come out lowercase, everything else as written', () => {
    expect(safeOptionColor(' Tomato ')).toBe('tomato')
    expect(safeOptionColor('#C96633')).toBe('#C96633')
  })

  test.each([
    ["Georgia, serif", 'Georgia, serif'],
    ["'Iowan Old Style',  'Palatino Linotype',Georgia,serif", "'Iowan Old Style', 'Palatino Linotype', Georgia, serif"],
    ['"Comic Sans MS", cursive', '"Comic Sans MS", cursive'],
    ["'Source Serif 4', Georgia, serif", "'Source Serif 4', Georgia, serif"],
  ])('font %j passes as %j', (value, expected) => {
    expect(safeOptionFont(value)).toBe(expected)
  })

  test.each([
    '',
    'Georgia; color: red',
    'Georgia} body {display:none',
    "'Georgia",
    "Georgia'",
    "'Geor'gia'",
    'url(x), serif',
    'Georgia, <b>',
    'Georgia\\, serif',
    'a,,b',
    'a, b, c, d, e, f, g, h, i',
  ])('font %j is refused', (value) => {
    expect(safeOptionFont(value)).toBeUndefined()
  })
})

describe('reading them from the source', () => {
  test('names slugify into variables', () => {
    expect(optionVar({ type: 'color', name: 'Link hover' })).toBe('--color-link-hover')
    expect(optionVar({ type: 'font', name: 'Headings!' })).toBe('--font-headings')
    expect(optionKey({ type: 'color', name: 'Link  Hover' })).toBe('color:link-hover')
  })

  test('colours and fonts, in order, from anywhere in a fragment', () => {
    const { options, warnings } = scanThemeOptions(PAGE)
    expect(options).toEqual([
      { type: 'color', name: 'Accent', value: '#c96633' },
      { type: 'font', name: 'Headings', value: 'Georgia, serif' },
    ])
    expect(warnings).toEqual([])
  })

  test('entities in content are decoded once', () => {
    const { options } = scanThemeOptions(`<meta name="font:Body" content="&#39;Fraunces&#39;, serif">`)
    expect(options[0].value).toBe("'Fraunces', serif")
  })

  test('other metas, commented-out ones and ones inside <style> are not options', () => {
    const { options, spans } = scanThemeOptions(
      `<meta name="description" content="x"><meta name="twitter:card" content="summary"><!-- <meta name="color:A" content="red"> --><style>/* <meta name="color:B" content="red"> */</style>`
    )
    expect(options).toEqual([])
    expect(spans).toEqual([])
  })

  test('a bad value, a missing name, a repeat and a type we lack each get a warning and no option', () => {
    const { options, warnings } = scanThemeOptions(
      [
        '<meta name="color:Accent" content="#c96633">',
        '<meta name="color:Ink" content="red; } body { display: none">',
        '<meta name="color:" content="#fff">',
        '<meta name="color:accent" content="#000">',
        '<meta name="font:Body" content="url(x)">',
        '<meta name="if:Show sidebar" content="1">',
        '<meta name="color:Paper">',
      ].join('\n')
    )
    expect(options).toEqual([{ type: 'color', name: 'Accent', value: '#c96633' }])
    expect(warnings).toEqual([
      `Line 2: "red; } body { display: none" isn't a colour color:Ink can use. Try a hex code like #c96633.`,
      'Line 3: <meta name="color:"> needs a name after the colon, like color:Accent.',
      'Line 4: color:accent is already set on line 1, so this one does nothing.',
      `Line 5: "url(x)" isn't a font list font:Body can use. Write font names split by commas, like Georgia, serif.`,
      "Line 6: if:Show sidebar isn't something pages here can set yet. Colours (color:) and fonts (font:) work.",
      `Line 7: "" isn't a colour color:Paper can use. Try a hex code like #c96633.`,
    ])
  })
})

describe('compiling a page with options', () => {
  test('the options go on the head, the tags never reach the page, nothing is reported stripped', () => {
    const artifacts = compileTemplateToArtifacts(PAGE)
    expect(artifacts.strippedComponents).toEqual([])
    expect(artifacts.warnings).toEqual([])
    expect(artifacts.ast.head?.options).toEqual([
      { type: 'color', name: 'Accent', value: '#c96633' },
      { type: 'font', name: 'Headings', value: 'Georgia, serif' },
    ])
    expect(artifacts.staticHTML).not.toMatch(/<meta|color:Accent|#c96633/)
    // The page is exactly what it would be without them
    const without = compileTemplateToArtifacts(PAGE.replace(/<meta[^>]*>\n/g, ''))
    expect(artifacts.staticHTML).toBe(without.staticHTML)
    expect(validThemeOptions(artifacts.ast.head?.options)).toEqual(artifacts.ast.head?.options)
  })

  test('in a pasted whole document, from the head or the body', () => {
    const doc = extractDocument(
      `<!doctype html><html><head><title>Mine</title><meta name="color:Accent" content="#c96633"></head>
<body><meta name="font:Body" content="Verdana, sans-serif"><p>hi</p></body></html>`
    )
    expect(doc.head.options).toEqual([
      { type: 'color', name: 'Accent', value: '#c96633' },
      { type: 'font', name: 'Body', value: 'Verdana, sans-serif' },
    ])
    expect(doc.body).toBe('<p>hi</p>')
  })

  test('a bad one is an editor warning, not an option', () => {
    const artifacts = compileTemplateToArtifacts('<meta name="color:Accent" content="#fff}"><p>hi</p>')
    expect(artifacts.ast.head?.options).toBeUndefined()
    expect(artifacts.warnings).toEqual([`Line 1: "#fff}" isn't a colour color:Accent can use. Try a hex code like #c96633.`])
    expect(artifacts.strippedComponents).toEqual([])
  })

  test('a page without options has no options on its head', () => {
    expect(extractDocument('<p>hi</p>').head.options).toBeUndefined()
  })
})

describe('the CSS they become', () => {
  test('variables on the root, before the page CSS, kept as roots by the advanced transform', () => {
    const { ast } = compileTemplateToArtifacts(PAGE)
    const documentCss = documentCssFromCompiledTemplate({ ast })
    expect(documentCss.bodyCss).toBe(':root {\n  --color-accent: #c96633;\n  --font-headings: Georgia, serif;\n}')
    const css = transformAdvancedCss('h1 { color: var(--color-accent); }', documentCss)
    expect(css).toMatch(/:scope:root \{\s*--color-accent: #c96633;\s*--font-headings: Georgia, serif;\s*\}/)
    expect(css.indexOf('--color-accent: #c96633')).toBeLessThan(css.indexOf('color: var(--color-accent)'))
  })

  test('a self-hosted font brings its @font-face rules, hoisted out of the scope', () => {
    const css = themeOptionsCss([{ type: 'font', name: 'Body', value: "'Fraunces', Georgia, serif" }])
    expect(css).toContain("font-family: 'Fraunces'")
    expect(css).toContain('@font-face')
    expect(themeOptionsCss([{ type: 'font', name: 'Body', value: 'Georgia, serif' }])).not.toContain('@font-face')
    const page = transformAdvancedCss('', { bodyCss: css })
    expect(page.indexOf('@font-face')).toBeLessThan(page.indexOf('@scope'))
  })

  test('a tampered stored copy is checked again: nothing but values reaches the CSS', () => {
    const tampered = [
      { type: 'color', name: 'Accent', value: 'red; } body { display: none } :root { --x: 1' },
      { type: 'color', name: 'Ink', value: '</style><script>alert(1)</script>' },
      { type: 'font', name: 'Body', value: "Georgia; background: url('https://evil.example/')" },
      { type: 'color', name: 'a;}body{color:red', value: '#fff' },
      { type: 'script', name: 'X', value: '#fff' },
      { type: 'color', name: 'x'.repeat(41), value: '#fff' },
      { type: 'color', name: 'Paper', value: '#f7f4ee' },
      'nonsense',
      null,
    ]
    expect(validThemeOptions(tampered)).toEqual([
      { type: 'color', name: 'a;}body{color:red', value: '#fff' },
      { type: 'color', name: 'Paper', value: '#f7f4ee' },
    ])
    const { bodyCss } = documentCssFromCompiledTemplate({ ast: { head: { options: tampered } } })
    expect(bodyCss).toBe(':root {\n  --color-a-body-color-red: #fff;\n  --color-paper: #f7f4ee;\n}')
    const injected = escapeCssForStyleTag(transformAdvancedCss('', { bodyCss }))
    expect(injected).not.toMatch(/<|url\(|script|display/)
    expect(validThemeOptions('not a list')).toEqual([])
    expect(documentHeadCss({ options: { length: 1 } })).toBe('')
  })

  test('escaping for the style tag holds even for a value that slipped through', () => {
    // Belt and braces: the transform output always goes through escapeCssForStyleTag
    expect(escapeCssForStyleTag(':root { --x: </style> }')).not.toContain('</style>')
  })
})

describe('rewriting values in the source', () => {
  const SOURCE = `<!-- my page -->
<meta name="color:Accent"   content="#c96633" >
<meta content='Georgia, serif' name='font:Headings'/>
<META NAME="color:Paper" CONTENT=#ffffff>
<meta name="color:Ink">
<div class="page">
  <h1 style="color: #c96633">Hi</h1>
</div>`

  test('only the targeted value changes, formatting and everything else stay', () => {
    const out = writeThemeOptions(SOURCE, { 'color:accent': '#112233' })
    expect(out).toBe(SOURCE.replace('content="#c96633"', 'content="#112233"'))
  })

  test('single-quoted attributes keep their quotes, with quotes in the value encoded', () => {
    const out = writeThemeOptions(SOURCE, { 'font:headings': "'Fraunces', Georgia, serif" })
    expect(out).toBe(SOURCE.replace("content='Georgia, serif'", "content='&#39;Fraunces&#39;, Georgia, serif'"))
    expect(scanThemeOptions(out).options.find((o) => o.name === 'Headings')?.value).toBe("'Fraunces', Georgia, serif")
  })

  test('an unquoted value gets quotes; a tag without a value is not an option to rewrite', () => {
    const out = writeThemeOptions(SOURCE, { 'color:paper': '#000000', 'color:ink': '#333333' })
    expect(out).toBe(SOURCE.replace('CONTENT=#ffffff>', 'CONTENT="#000000">'))
  })

  test('round trip: every value written reads back, and the page is unchanged', () => {
    const values = { 'color:accent': 'rgb(1, 2, 3)', 'font:headings': '"Comic Sans MS", cursive', 'color:paper': 'tomato' }
    const out = writeThemeOptions(SOURCE, values)
    const read = Object.fromEntries(scanThemeOptions(out).options.map((o) => [optionKey(o), o.value]))
    expect(read).toEqual(values)
    expect(out.split('<div class="page">')[1]).toBe(SOURCE.split('<div class="page">')[1])
  })

  test('unchanged, unknown and refused values leave the source alone', () => {
    expect(writeThemeOptions(SOURCE, { 'color:accent': '#c96633' })).toBe(SOURCE)
    expect(writeThemeOptions(SOURCE, { 'color:nope': '#000' })).toBe(SOURCE)
    expect(writeThemeOptions(SOURCE, { 'color:accent': 'red;}</style>', 'font:headings': 'url(x)' })).toBe(SOURCE)
  })

  test('only the first of a repeated option is rewritten (the one that counts)', () => {
    const twice = '<meta name="color:A" content="#111">\n<meta name="color:A" content="#222">'
    expect(writeThemeOptions(twice, { 'color:a': '#333' })).toBe('<meta name="color:A" content="#333">\n<meta name="color:A" content="#222">')
  })
})

describe('old gallery starters (now test fixtures)', () => {
  // The gallery's "Just HTML" starters when theme options came in
  const GALLERY = HTML_TEMPLATES.filter((t) => t.id !== 'conditional-showcase')

  // How each starter looked before it had options: the <style> contents and
  // the markup, hashed. With every var() put back to its default, the CSS
  // must be the same text; the markup without its option tags too.
  const BEFORE: Record<string, { css: string; html: string }> = {
    'quiet-garden': { css: '52a4d84cf3666314', html: 'e8cc1c88bc9c52ca' },
    'studio-nocturne': { css: '3033aded57a457f0', html: '32313930ea1f6bcf' },
    'simple-default': { css: '9ef03a029a842509', html: 'ef25288d90c113be' },
    'social-modern': { css: 'bd568ee90898e938', html: 'ed7344679c2e725c' },
    'classic-web1': { css: 'e358578c0df0584d', html: 'f5566eebb44a939f' },
  }
  const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16)

  /** As the gallery loads it: <style> to the CSS tab, the rest to the HTML tab */
  function split(template: string) {
    const css = template.match(/<style[^>]*>([\s\S]*?)<\/style>/)![1]
    const html = template.replace(/<style[^>]*>[\s\S]*?<\/style>/, '').trim()
    return { css, html }
  }

  test('every gallery starter is pinned', () => {
    expect(GALLERY.map((t) => t.id).sort()).toEqual(Object.keys(BEFORE).sort())
  })

  describe.each(GALLERY.map((t) => [t.id, t.template] as const))('%s', (id, template) => {
    const { css, html } = split(template)
    const { options } = scanThemeOptions(html)

    test('declares colours and fonts and compiles with nothing stripped or warned about', () => {
      expect(options.some((o) => o.type === 'color')).toBe(true)
      expect(options.some((o) => o.type === 'font')).toBe(true)
      const artifacts = compileTemplateToArtifacts(html)
      expect(artifacts.strippedComponents).toEqual([])
      expect(artifacts.warnings).toEqual([])
      expect(artifacts.ast.head?.options).toEqual(options)
    })

    test('its CSS uses every option, and only options it declares', () => {
      for (const option of options) expect(css).toContain(`var(${optionVar(option)})`)
      const used = [...css.matchAll(/var\((--(?:color|font)-[a-z0-9-]+)\)/g)].map((m) => m[1])
      expect(used.filter((v) => !options.some((o) => optionVar(o) === v))).toEqual([])
    })

    test('looks the same by default: CSS with defaults put back and markup without the tags are unchanged', () => {
      let resolved = css
      for (const option of options) resolved = resolved.split(`var(${optionVar(option)})`).join(option.value)
      expect(hash(resolved)).toBe(BEFORE[id].css)
      expect(hash(extractDocument(html).body.trim())).toBe(BEFORE[id].html)
    })

    test('compiles to the same page as the frozen SSR fixture', () => {
      const fixture = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'ssr-golden', `html-${id}.input.json`), 'utf8')
      )
      const { ast } = compileTemplateToArtifacts(template)
      const { head, ...page } = ast
      expect(head).toEqual({ fontImports: [], otherStylesheets: [], options })
      // The fixture may keep the head too (UPDATE_SSR_GOLDEN writes it); checked above
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { head: _frozenHead, ...frozen } = fixture.ast
      expect(JSON.parse(JSON.stringify(page))).toEqual(frozen)
    })
  })
})

describe('starter pages', () => {
  // The gallery's starters (lib/templates/starters), as the gallery loads them
  describe.each(STARTERS.map((s) => [s.id, s.template] as const))('%s', (_id, template) => {
    const { css, html } = splitStarter(template)
    const { options } = scanThemeOptions(html)

    test('declares colours and fonts and compiles with nothing stripped or warned about', () => {
      expect(options.some((o) => o.type === 'color')).toBe(true)
      expect(options.some((o) => o.type === 'font')).toBe(true)
      const artifacts = compileTemplateToArtifacts(html)
      expect(artifacts.strippedComponents).toEqual([])
      expect(artifacts.warnings).toEqual([])
      expect(artifacts.ast.head?.options).toEqual(options)
    })

    test('its CSS uses every option, and only options it declares', () => {
      for (const option of options) expect(css).toContain(`var(${optionVar(option)})`)
      const used = [...css.matchAll(/var\((--(?:color|font)-[a-z0-9-]+)\)/g)].map((m) => m[1])
      expect(used.filter((v) => !options.some((o) => optionVar(o) === v))).toEqual([])
    })

    test('is written for people, not a demo: no emoji, no em dashes, no placeholder links to nowhere', () => {
      expect(template).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(template).not.toContain('\u2014')
      expect(template).not.toMatch(/href="#"/)
    })

    test('has a focus style, a phone layout, and keeps still for reduced motion if anything moves', () => {
      expect(css).toMatch(/:focus-visible/)
      expect(css).toMatch(/@media \(max-width: 600px\)/)
      if (/animation:/.test(css)) expect(css).toMatch(/prefers-reduced-motion: reduce/)
    })
  })
})
