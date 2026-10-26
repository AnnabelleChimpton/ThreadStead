import { cssProblems } from '../css-problems'

test('fine CSS, and none at all, have nothing to say', () => {
  expect(cssProblems('')).toEqual([])
  expect(cssProblems(`@import url("https://fonts.googleapis.com/css2?family=VT323");
@media (min-width: 40rem) { a { content: "{"; } }
/* } */ p { color: red }`)).toEqual([])
})

test('an unclosed { is said at its line (it swallows the rest of the file)', () => {
  expect(cssProblems('a { color: red; }\nh1 { color: blue;\np { color: green; }')).toEqual([
    expect.stringMatching(/^Line 2: this \{ is never closed/),
  ])
})

test('a stray } and an unclosed comment are said once', () => {
  expect(cssProblems('}\na { color: red } }')).toEqual([expect.stringMatching(/^Line 1: this \} has no \{/)])
  expect(cssProblems('a { color: red }\n/* old')).toEqual([expect.stringMatching(/^Line 2: this \/\* comment is never closed/)])
})

test('an @import from elsewhere and an http:// font say why, with their line', () => {
  const problems = cssProblems(`a { color: red }
@import url("https://cdn.example/style.css");
@font-face { font-family: X; src: url(https://fonts.gstatic.com/x.woff2), url("https://cdn.example/x.woff2"), url(http://old.example/x.ttf); }`)
  // Fonts load from any https address; only http:// ones fail
  expect(problems).toEqual([
    expect.stringMatching(/^Line 2: @import from https:\/\/cdn\.example\/style\.css \(only Google Fonts can be imported\) is taken out when you save\.$/),
    expect.stringMatching(/^Line 3: "http:\/\/old\.example\/x\.ttf" starts with http:\/\/, so browsers ask for https:\/\/ instead, and it won't load/),
  ])
})

test('pictures by old-site address or http:// say so, once each', () => {
  const problems = cssProblems(`body { background: url(stars.gif) }
.a { background: url("../img/a.png") }
.b { background: url(http://old.example/b.gif) }
.ok { background: url(https://x.example/c.gif), url(/assets/d.gif), url(data:image/png;base64,AA) }`)
  expect(problems).toEqual([
    expect.stringMatching(/^Line 1: "stars\.gif" is an address on your old site.*\(1 more like it too\.\)$/),
    expect.stringMatching(/^Line 3: "http:\/\/old\.example\/b\.gif" starts with http:\/\//),
  ])
})


describe('property names the browser does not know', () => {
  const KNOWN = new Set(['color', 'background', 'background-color', 'margin', 'padding', 'border', 'font-size', 'filter', 'content', 'font-family'])
  const knows = (property: string) => KNOWN.has(property)

  it('says which, on which line, with what was probably meant', () => {
    const problems = cssProblems('body {\n  background: #A1E3D6;\n  text-color: #008A6C;\n  margin: 0;\n}', knows)
    expect(problems).toEqual(['Line 3: your browser doesn\'t know "text-color", so that line does nothing. Did you mean "color"?'])
  })

  it('once per name, inside nesting and @media, and not for selectors', () => {
    const css = `.a { colour: red; .b:hover { colour: blue } }
@media (max-width: 600px) { .c { wibble: 1 } }
.d { &:focus-visible { color: red } }`
    expect(cssProblems(css, knows)).toEqual([
      'Line 1: your browser doesn\'t know "colour", so that line does nothing. Did you mean "color"? (1 more like it too.)',
      'Line 2: your browser doesn\'t know "wibble", so that line does nothing.',
    ])
  })

  it('leaves alone custom properties, vendor prefixes, IE hacks, descriptors, strings and comments', () => {
    const css = `:root { --edge: red; }
.a { -webkit-text-stroke: 1px; *zoom: 1; _height: 1px; content: "x: y; z"; /* nope: 1 */ filter: progid:DXImageTransform.Microsoft.gradient(a=1); }
@font-face { font-family: X; src: url(https://example.com/x.woff2); unicode-range: U+0-FF; }
@property --x { syntax: '<color>'; inherits: false; initial-value: red; }`
    expect(cssProblems(css, knows)).toEqual([])
  })

  it('says nothing without a browser to ask', () => {
    expect(cssProblems('a { text-color: red }')).toEqual([])
  })
})
