/**
 * GOLDEN: a page pasted into "your own HTML page" comes out the way it went
 * in (design/profile-editing-audit/PLAN.md, Phase 1).
 *
 * Each block pins one fix: the parser decodes entities (no pre-decode), the
 * syntax pre-check only polices component tags, ids and the things that
 * point at them line up, the allowlist covers how people write pages,
 * components need PascalCase, and whole documents keep only their body.
 * The corpus block runs a sadgrl-style layout and a 2003 table page through
 * the pipeline and compares the result with how a browser parses the
 * original.
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
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import {
  compileTemplateToArtifacts,
  TemplateCompilationError,
} from '@/lib/templates/compilation/compile-pipeline'
import { compileTemplate } from '@/lib/templates/compilation/template-parser'
import {
  documentCssFromCompiledTemplate,
  extractDocument,
  fontImportsFromCompiledTemplate,
  legacyBodyCss,
} from '@/lib/templates/compilation/document-head'
import { transformAdvancedCss, SITE_LAYER_ORDER } from '@/lib/utils/css/css-transform'
import { domAttributeToReactProp } from '@/lib/templates/core/attribute-mappings'

const compile = (template: string) => compileTemplateToArtifacts(template)

function compileErrors(template: string): string[] {
  try {
    compileTemplateToArtifacts(template)
    return []
  } catch (e) {
    if (e instanceof TemplateCompilationError) return e.errors
    throw e
  }
}

describe('entities: the parser decodes them, once', () => {
  test('a code sample stays text', () => {
    const { staticHTML } = compile('<pre>&lt;div class="box"&gt;copy me&lt;/div&gt;</pre>')
    expect(staticHTML).toContain('&lt;div class=&quot;box&quot;&gt;copy me&lt;/div&gt;')
    expect(staticHTML).not.toContain('<div class="box">')
  })

  test('showing component syntax does not create a component', () => {
    const { islands, staticHTML } = compile('<p>Tip: write <code>&lt;Guestbook /&gt;</code></p>')
    expect(islands).toEqual([])
    expect(staticHTML).toContain('&lt;Guestbook /&gt;')
  })

  test('webring arrows survive: &lt; prev | next &gt;', () => {
    const { staticHTML } = compile('<p><a href="/a">&lt; prev</a> | <a href="/b">next &gt;</a></p>')
    expect(staticHTML).toContain('>&lt; prev</a>')
    expect(staticHTML).toContain('>next &gt;</a>')
  })

  test('escaped quotes in attributes stay inside the attribute', () => {
    const { staticHTML } = compile('<p title="she said &quot;hi&quot; to me">x</p>')
    expect(staticHTML).toContain('title="she said &quot;hi&quot; to me"')
  })

  test('double-escaped text keeps one level of escaping', () => {
    const { staticHTML } = compile('<p>&amp;lt;tag&amp;gt;</p>')
    expect(staticHTML).toContain('&amp;lt;tag&amp;gt;')
  })

  test.each([
    [`<Var name="state" initial='{"open":true}' />`],
    [`<Var name="state" initial="{&quot;open&quot;:true}" />`],
  ])('JSON in initial still reaches the component: %s', (template) => {
    const { islands } = compile(template)
    const v = islands.find((i) => i.component === 'var')
    expect(v).toBeDefined()
    expect(JSON.stringify(v!.props)).toContain('open')
  })

  test('broken JSON in initial is still an error, with entities decoded first', () => {
    expect(compileErrors(`<Var name="s" initial="{open:true}" />`).join(' ')).toMatch(/Invalid JSON/)
  })
})

describe('the syntax pre-check leaves HTML to the HTML parser', () => {
  test.each([
    ['paragraphs without </p>', '<div><p>one<p>two</div>'],
    ['list items without </li>', '<ul><li>a<li>b</ul>'],
    ['table cells and rows without end tags', '<table><tr><td>a<td>b<tr><td>c</table>'],
    ['options without </option>', '<select><option>a<option>b</select>'],
    ['mixed-case tags', '<div><P>para</p><Table><TR><TD>x</td></TR></Table></div>'],
    ['a tag inside a comment', '<!-- <div class="old"> -->\n<div class="wrap"><p>hi</p></div>'],
    ['an unclosed div (browsers close it)', '<div class="wrap"><p>hi</p>'],
    ['a stray closing tag', '<p>hi</p></span>'],
  ])('%s compiles', (_name, template) => {
    expect(compileErrors(template)).toEqual([])
  })

  test('"a<b" reads like a browser reads it, with a warning', () => {
    const { warnings, staticHTML } = compile('<p>if a<b then</p>')
    expect(staticHTML).toContain('<b>')
    expect(warnings.join(' ')).toMatch(/&lt;/)
  })

  test('an unclosed component is an error', () => {
    expect(compileErrors('<If data="x"><p>hi</p>').join(' ')).toMatch(/Unclosed tag <If>/)
  })

  test('a component closed with different capitals is an error that says so', () => {
    const errors = compileErrors('<If data="x"><p>hi</p></if>').join(' ')
    expect(errors).toMatch(/case-sensitive/)
  })

  test('crossed components are an error', () => {
    expect(compileErrors('<IfOwner><IfVisitor></IfOwner></IfVisitor>').length).toBeGreaterThan(0)
  })

  test('an attribute quote that never closes is still an error', () => {
    expect(compileErrors('<div class="oops><p>x</p></div>').join(' ')).toMatch(/Unclosed quote/)
  })

  test('<br/> is one line break, not two', () => {
    const { staticHTML } = compile('<p>a<br/>b<br />c</p>')
    expect(staticHTML.match(/<br/g)).toHaveLength(2)
  })

  test('raw-text content is never read as tags', () => {
    const { staticHTML, strippedComponents } = compile(
      '<textarea><a href="https://example.neocities.org"><img src="b.png"></a></textarea>'
    )
    expect(staticHTML).toContain('&lt;a href=')
    expect(strippedComponents).toEqual([])
  })
})

describe('ids: prefixed in the DOM, and everything that points at them follows', () => {
  test('in-page links and the ids they jump to match', () => {
    const { staticHTML } = compile('<p><a href="#about">about</a></p><h2 id="about">About</h2>')
    expect(staticHTML).toContain('href="#user-content-about"')
    expect(staticHTML).toContain('id="user-content-about"')
  })

  test('a bare # link stays a bare #', () => {
    expect(compile('<a href="#">top</a>').staticHTML).toContain('href="#"')
  })

  test('<label for> renders as for, pointing at the prefixed id', () => {
    const { staticHTML } = compile('<label for="name">name</label><input type="text" id="name">')
    expect(staticHTML).toContain('<label for="user-content-name">')
    expect(staticHTML).not.toMatch(/htmlFor/i)
  })

  test('image maps, aria references and SVG url() references line up', () => {
    const { staticHTML } = compile(
      '<div><img src="a.gif" usemap="#m"><map name="m"><area shape="rect" coords="0,0,9,9" href="/x"></map>' +
        '<p id="d">hint</p><input type="text" aria-describedby="d">' +
        '<svg viewBox="0 0 10 10"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs>' +
        '<rect width="10" height="10" filter="url(#blur)" style="filter:url(#blur)"/></svg></div>'
    )
    expect(staticHTML).toContain('usemap="#user-content-m"')
    expect(staticHTML).toContain('name="user-content-m"')
    expect(staticHTML).toContain('aria-describedby="user-content-d"')
    expect(staticHTML).toContain('filter="url(#user-content-blur)"')
    expect(staticHTML).toContain('style="filter:url(#user-content-blur)"')
  })
})

describe('the allowlist follows how people write pages', () => {
  test.each([
    'marquee', 'center', 'font', 'u', 'small', 'mark', 'abbr', 'time', 'cite', 'blink',
  ])('<%s> survives', (tag) => {
    const { staticHTML, strippedComponents } = compile(`<div><${tag}>x</${tag}></div>`)
    expect(staticHTML).toContain(`<${tag}>x</${tag}>`)
    expect(strippedComponents).toEqual([])
  })

  test('figure, figcaption and table captions survive', () => {
    const { staticHTML } = compile(
      '<div><figure><img src="a.png" alt="a"><figcaption>cap</figcaption></figure>' +
        '<table><caption>c</caption><tr><td>x</td></tr></table></div>'
    )
    expect(staticHTML).toContain('<figcaption>cap</figcaption>')
    expect(staticHTML).toContain('<caption>c</caption>')
  })

  test('old-web presentational attributes survive', () => {
    const { staticHTML } = compile(
      '<div><marquee behavior="alternate" scrollamount="6">hi</marquee><font face="Comic Sans MS" color="hotpink">x</font>' +
        '<table border="1" cellpadding="5" bgcolor="#222"><tr><td valign="top" bgcolor="#333">a</td></tr></table></div>'
    )
    for (const attr of ['behavior="alternate"', 'scrollamount="6"', 'face="Comic Sans MS"', 'color="hotpink"',
      'border="1"', 'cellpadding="5"', 'bgcolor="#222"', 'valign="top"', 'bgcolor="#333"']) {
      expect(staticHTML).toContain(attr)
    }
  })

  test('<font size="+3"> keeps its meaning (size 6)', () => {
    expect(compile('<font size="+3">big</font>').staticHTML).toContain('size="6"')
    expect(compile('<font size="-1">small</font>').staticHTML).toContain('size="-1"')
  })

  test('inline SVG art keeps its shapes and viewBox', () => {
    const { staticHTML } = compile(
      '<svg width="40" height="40" viewBox="0 0 40 40"><g><circle cx="20" cy="20" r="18" fill="#c2410c" stroke-width="2"/>' +
        '<path d="M0 0L10 10"/><text x="2" y="30">hi</text></g></svg>'
    )
    expect(staticHTML).toContain('viewBox="0 0 40 40"')
    expect(staticHTML).toContain('<circle cx="20" cy="20" r="18" fill="#c2410c" stroke-width="2">')
    expect(staticHTML).toContain('<path d="M0 0L10 10">')
    expect(staticHTML).toContain('<text x="2" y="30">hi</text>')
  })

  test('aria-* and role survive', () => {
    const { staticHTML } = compile('<nav aria-label="site" role="navigation"><p aria-hidden="true">x</p></nav>')
    expect(staticHTML).toContain('aria-label="site"')
    expect(staticHTML).toContain('role="navigation"')
    expect(staticHTML).toContain('aria-hidden="true"')
  })

  test('target="_blank" links get rel="noopener"; other targets are dropped', () => {
    const { staticHTML } = compile(
      '<p><a href="https://a.example" target="_blank">a</a><a href="https://b.example" target="_top">b</a></p>'
    )
    expect(staticHTML).toContain('href="https://a.example" target="_blank" rel="noopener"')
    expect(staticHTML).toContain('<a href="https://b.example">b</a>')
  })

  test('ordinary inputs stay what they are, with their attributes', () => {
    const { staticHTML } = compile(
      '<form><input type="text" placeholder="your name" required><input type="email">' +
        '<input type="number" min="1" max="9" step="2"><input type="range"><input type="submit" value="go"></form>'
    )
    expect(staticHTML).toContain('<input type="text" placeholder="your name" required />')
    expect(staticHTML).toContain('<input type="email" />')
    expect(staticHTML).toContain('<input type="number" min="1" max="9" step="2" />')
    expect(staticHTML).toContain('<input type="submit" value="go" />')
    expect(staticHTML).not.toMatch(/disabled|checkbox/)
  })

  test('audio and video keep src, controls and friends', () => {
    const { staticHTML } = compile(
      '<div><audio controls loop preload="none" src="https://example.neocities.org/song.mp3">fallback</audio>' +
        '<video controls muted playsinline poster="https://example.neocities.org/p.jpg" width="320">' +
        '<source src="https://example.neocities.org/clip.mp4" type="video/mp4"></video></div>'
    )
    expect(staticHTML).toContain('<audio controls loop preload="none" src="https://example.neocities.org/song.mp3">')
    expect(staticHTML).toMatch(/<video controls muted playsinline poster="https:\/\/example\.neocities\.org\/p\.jpg" width="320">/)
    expect(staticHTML).toContain('<source src="https://example.neocities.org/clip.mp4" type="video/mp4"')
  })

  test('autoplay only survives on muted media', () => {
    expect(compile('<audio autoplay src="https://a.example/s.mp3"></audio>').staticHTML).not.toContain('autoplay')
    expect(compile('<video autoplay muted src="https://a.example/v.mp4"></video>').staticHTML).toContain('autoplay')
  })
})

describe('components need PascalCase; HTML with the same name stays HTML', () => {
  test.each([
    ['<button type="button" class="mybtn">click</button>', '<button type="button" class="mybtn">click</button>'],
    ['<select name="mood"><option value="a">a</option></select>', '<option value="a">a</option>'],
    ['<p>the variable <var>x</var> is fun</p>', '<var>x</var>'],
    ['<svg viewBox="0 0 9 9"><filter id="f"><feGaussianBlur stdDeviation="1"/></filter></svg>', '<filter id="user-content-f">'],
  ])('%s', (template, expected) => {
    const { islands, staticHTML, strippedComponents } = compile(template)
    expect(islands).toEqual([])
    expect(staticHTML).toContain(expected)
    expect(strippedComponents).toEqual([])
  })

  test('the PascalCase spelling is still the component', () => {
    const { islands } = compile('<Button><OnClick><Increment var="n" /></OnClick>More</Button>')
    expect(islands.map((i) => i.component)).toEqual(expect.arrayContaining(['button', 'onclick']))
  })

  test('a lowercase component name is reported with the capital-letter fix', () => {
    const { islands, strippedComponents } = compile('<div><guestbook></guestbook></div>')
    expect(islands).toEqual([])
    expect(strippedComponents[0]).toMatchObject({ name: 'guestbook', category: 'unsupported' })
    expect(strippedComponents[0].reason).toContain('<Guestbook>')
  })

  test('an all-caps 2003 tag is HTML, never a component', () => {
    expect(compile('<FORM><BUTTON>go</BUTTON><SELECT><OPTION>a</SELECT></FORM>').islands).toEqual([])
  })
})

describe('whole documents', () => {
  const lowercaseDoc = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>tiny site</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=VT323&amp;display=swap" rel="stylesheet">
</head>
<body class="dark" style="margin: 2rem">
<h1>tiny site</h1>
<p>hello</p>
</body>
</html>`

  test('a lowercase doctype with body attributes is a document: body only, no title text', () => {
    const { staticHTML } = compile(lowercaseDoc)
    expect(staticHTML).toContain('<h1>tiny site</h1>')
    expect(staticHTML.match(/tiny site/g)).toHaveLength(1)
    expect(staticHTML).not.toMatch(/<(html|head|body|meta|link|title)\b/)
  })

  test('the title and Google Fonts are kept with the compiled page', () => {
    const artifacts = compile(lowercaseDoc)
    const fontLine = '@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");'
    expect(artifacts.head).toMatchObject({ title: 'tiny site', fontImports: [fontLine] })
    // stored on the AST root, which the save API keeps, and read back by _app.tsx
    expect(fontImportsFromCompiledTemplate({ ast: artifacts.ast })).toEqual([fontLine])
    expect(transformAdvancedCss('', { fontImports: fontImportsFromCompiledTemplate({ ast: artifacts.ast }) })).toBe(`${SITE_LAYER_ORDER}\n${fontLine}`)
  })

  test('only Google Fonts URLs can come back out of a stored page as imports', () => {
    expect(fontImportsFromCompiledTemplate({ ast: { head: { fontImports: [
      '@import url("https://fonts.googleapis.com/css2?family=A");',
      '@import url("https://evil.example/x.css");',
      '@import url("https://fonts.googleapis.com/css2?family=A");}body{',
      42,
    ] } } })).toEqual(['@import url("https://fonts.googleapis.com/css2?family=A");'])
  })

  test('an uppercase 2003 document is detected too', () => {
    const doc = extractDocument('<HTML><HEAD><TITLE>hi</TITLE></HEAD><BODY BGCOLOR="#000"><P>x</BODY></HTML>')
    expect(doc).toMatchObject({ isFullDocument: true, body: '<P>x', head: { title: 'hi' } })
  })

  test('<body bgcolor text link vlink background> become CSS that the page CSS can still override', () => {
    const artifacts = compile(
      '<html><body BGCOLOR="#000000" TEXT="00FF00" LINK="#FF00FF" VLINK="cyan" BACKGROUND="https://example.neocities.org/stars.gif"><p>x</p></body></html>'
    )
    expect(artifacts.head?.body).toEqual({
      bgColor: '#000000', text: '#00FF00', link: '#FF00FF', vLink: 'cyan',
      background: 'https://example.neocities.org/stars.gif',
    })
    const { bodyCss } = documentCssFromCompiledTemplate({ ast: artifacts.ast })
    const out = transformAdvancedCss('body { color: white }', { bodyCss })
    expect(out).toContain(
      ':scope body { background-color: #000000; color: #00FF00; background-image: url("https://example.neocities.org/stars.gif"); }'
    )
    expect(out).toContain(':scope body :where(a:link) { color: #FF00FF; }')
    // the page's own rule comes after, so it wins the tie
    expect(out.indexOf('color: white')).toBeGreaterThan(out.indexOf('color: #00FF00'))
  })

  test('body attribute values that are not plain colours or https images are dropped', () => {
    expect(legacyBodyCss({
      bgColor: 'red;} * {color:red', text: 'url(x)', link: '#12', background: 'http://insecure.example/a.gif',
    })).toBe('')
    expect(legacyBodyCss({ background: 'https://a.example/x.gif") , url("https://b.example' })).toBe('')
    expect(documentCssFromCompiledTemplate({ ast: { head: { body: { bgColor: '#fff}' } } } }).bodyCss).toBe('')
  })

  test('a fragment is not a document', () => {
    expect(extractDocument('<div>hi</div>').isFullDocument).toBe(false)
  })

  test('the stripped report groups wrappers, unsupported tags and safety removals', () => {
    const { strippedComponents } = compile(
      lowercaseDoc.replace('<p>hello</p>', '<p>hello</p><iframe src="https://a.example"></iframe><blinky>x</blinky>')
        .replace('</head>', '<link rel="stylesheet" href="/style.css"></head>')
    )
    const byName = Object.fromEntries(strippedComponents.map((s) => [s.name, s]))
    for (const name of ['html', 'head', 'meta', 'title', 'body']) {
      expect(byName[name]).toMatchObject({ category: 'document' })
      expect(byName[name].reason).toMatch(/^Document wrapper \(expected\)/)
    }
    expect(byName.link).toMatchObject({ category: 'unsupported' })
    expect(byName.link.reason).toMatch(/CSS tab/)
    expect(byName.link.count).toBe(2)
    expect(byName.blinky).toMatchObject({ category: 'unsupported' })
    expect(byName.iframe).toMatchObject({ category: 'safety' })
    expect(byName.iframe.reason).toMatch(/^Removed for safety/)
    // grouped: wrappers first, safety last
    const order = strippedComponents.map((s) => s.category)
    expect(order).toEqual([...order].sort((a, b) =>
      ['document', 'unsupported', 'safety'].indexOf(a!) - ['document', 'unsupported', 'safety'].indexOf(b!)))
  })

  test('a stray <style> or <title> never turns into visible text', () => {
    const { staticHTML } = compile('<div><title>my site</title><style>.a{color:red}</style><p>x</p></div>')
    expect(staticHTML).not.toContain('my site')
    expect(staticHTML).not.toContain('color:red')
  })
})

// ---------------------------------------------------------------------------
// Corpus: pages as people actually paste them
// ---------------------------------------------------------------------------

const CORPUS = path.join(__dirname, '..', 'corpus')
const readCorpus = (file: string) => fs.readFileSync(path.join(CORPUS, file), 'utf8')

/** The editor moves <style> blocks into the CSS tab before compiling. */
function splitLikeTheEditor(page: string): { template: string; css: string } {
  const css = (page.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
    .map((block) => block.replace(/<\/?style[^>]*>/gi, '').trim())
    .join('\n\n')
  return { template: page.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim(), css }
}

type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] }

/** Element names (with their attribute names) and text, in document order. */
function outline(nodes: HastNode[]): string[] {
  const out: string[] = []
  const walk = (node: HastNode) => {
    if (node.type === 'text') {
      const text = (node.value || '').replace(/\s+/g, ' ').trim()
      if (text) out.push(`"${text}"`)
      return
    }
    if (node.type !== 'element') return
    const attrs = Object.keys(node.properties || {}).filter((k) => k !== 'rel').sort().join(' ')
    out.push(`<${node.tagName}${attrs ? ' ' + attrs : ''}>`)
    node.children?.forEach(walk)
    out.push(`</${node.tagName}>`)
  }
  nodes.forEach(walk)
  return out
}

/** How a browser parses the original file: the children of <body>. */
function browserBody(page: string): HastNode[] {
  const tree = unified().use(rehypeParse).parse(page) as unknown as HastNode
  const html = tree.children!.find((n) => n.tagName === 'html')!
  return html.children!.find((n) => n.tagName === 'body')!.children!
}

function ourPage(staticHTML: string): HastNode[] {
  const tree = unified().use(rehypeParse, { fragment: true }).parse(staticHTML) as unknown as HastNode
  return tree.children!
}

describe.each([
  ['sadgrl-layout.html'],
  ['y2k-table-2003.html'],
])('corpus: %s', (file) => {
  const page = readCorpus(file)
  const { template, css } = splitLikeTheEditor(page)

  test('compiles without errors or warnings, losing only the document wrappers', () => {
    const artifacts = compile(template)
    expect(artifacts.warnings).toEqual([])
    expect(artifacts.islands).toEqual([])
    expect(artifacts.strippedComponents.map((s) => s.category)).toEqual(
      artifacts.strippedComponents.map(() => 'document')
    )
  })

  test('comes out with the same elements, attributes and text a browser sees', () => {
    const { staticHTML } = compile(template)
    expect(outline(ourPage(staticHTML))).toEqual(outline(browserBody(page)))
  })

  test('its CSS keeps working root selectors', () => {
    const out = transformAdvancedCss(css)
    expect(out).not.toMatch(/body\s+(body|:root|html)\b/)
  })
})

describe('corpus details', () => {
  test('sadgrl: the jump link reaches its heading, the copy-my-button code stays text', () => {
    const { staticHTML } = compile(splitLikeTheEditor(readCorpus('sadgrl-layout.html')).template)
    expect(staticHTML).toContain('href="#user-content-jump"')
    expect(staticHTML).toContain('id="user-content-jump"')
    expect(staticHTML).toContain('<textarea>&lt;a href=&quot;https://example.neocities.org&quot;&gt;')
  })

  test('2003: marquee, font, table attributes and the unclosed <P>s come through', () => {
    const { staticHTML } = compile(readCorpus('y2k-table-2003.html'))
    expect(staticHTML).toContain('<marquee behavior="alternate" scrollamount="6"><font size="6" color="hotpink">')
    expect(staticHTML).toContain('<table border="1" cellpadding="5" cellspacing="0" width="600" bgcolor="#222222">')
    expect(staticHTML.match(/<p>/g)).toHaveLength(2)
    expect(staticHTML).toContain('<u>my cat</u>')
    expect(staticHTML).not.toMatch(/JeSsiCa/) // the <TITLE> text
  })
})

describe('compileTemplate keeps working for callers that use it directly', () => {
  test('component nodes are marked on the AST, plain HTML is not', () => {
    const parsed = compileTemplate('<div><button>a</button><Button>b</Button></div>')
    expect(parsed.success).toBe(true)
    const json = JSON.stringify(parsed.ast)
    expect(json.match(/"component":true/g)).toHaveLength(1)
  })
})

describe('pages with components: compiled HTML back into React keeps attribute meaning', () => {
  test.each([
    [['audio', 'controls', '', false], ['controls', true]],
    [['details', 'open', '', false], ['open', true]],
    [['input', 'required', '', false], ['required', true]],
    [['input', 'checked', '', false], ['defaultChecked', true]],
    [['input', 'value', 'go', false], ['defaultValue', 'go']],
    [['nav', 'aria-label', 'site', false], ['aria-label', 'site']],
    [['label', 'for', 'user-content-n', false], ['htmlFor', 'user-content-n']],
    [['div', 'class', 'a b', false], ['className', 'a b']],
    [['td', 'colspan', '2', false], ['colSpan', '2']],
    [['rect', 'stroke-width', '2', true], ['strokeWidth', '2']],
    [['svg', 'viewBox', '0 0 9 9', true], ['viewBox', '0 0 9 9']],
    [['marquee', 'scrollamount', '6', false], ['scrollamount', '6']],
  ] as const)('%j → %j', ([tag, name, value, inSvg], expected) => {
    expect(domAttributeToReactProp(tag, name, value, inSvg)).toEqual(expected)
  })
})

describe('the page is parsed as written', () => {
  // A leftover step wrapped several top-level elements in a <div>, then
  // unwrapped any lone plain <div>, dropping the spaces between them and the
  // author's own wrapper (template audit 01 #2)
  test('spaces between top-level elements stay: a row of 88x31 buttons keeps its gaps', () => {
    const { staticHTML } = compileTemplateToArtifacts('<a href="/1"><img src="1.gif" alt="one"></a> <a href="/2"><img src="2.gif" alt="two"></a>')
    expect(staticHTML).toContain('</a> <a')
  })

  test("the author's own plain wrapper <div> stays", () => {
    const { ast } = compileTemplateToArtifacts('<div><p>one</p><p>two</p></div>')
    expect(ast.children).toHaveLength(1)
    expect(ast.children?.[0]).toMatchObject({ type: 'element', tagName: 'div' })
  })
})

describe('images further down load as they are scrolled to', () => {
  test('the first three load straight away, the rest lazily, unless the page says', () => {
    const imgs = [1, 2, 3, 4, 5].map((i) => `<img src="${i}.gif" alt="${i}">`).join('') + '<img src="6.gif" alt="6" loading="eager">'
    const { staticHTML } = compileTemplateToArtifacts(`<p>${imgs}</p>`)
    const loading = [...staticHTML.matchAll(/<img[^>]*>/g)].map(([tag]) => tag.match(/loading="(\w+)"/)?.[1] ?? null)
    expect(loading).toEqual([null, null, null, 'lazy', 'lazy', 'eager'])
  })
})
