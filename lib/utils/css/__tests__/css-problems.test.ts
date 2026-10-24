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

