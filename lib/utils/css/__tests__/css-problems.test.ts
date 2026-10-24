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

test('an @import from elsewhere and a font from elsewhere say why, with their line', () => {
  const problems = cssProblems(`a { color: red }
@import url("https://cdn.example/style.css");
@font-face { font-family: X; src: url(https://fonts.gstatic.com/x.woff2), url("https://cdn.example/x.woff2"); }`)
  expect(problems).toEqual([
    expect.stringMatching(/^Line 2: @import from https:\/\/cdn\.example\/style\.css \(only Google Fonts can be imported\) is taken out when you save\.$/),
    expect.stringMatching(/^Line 3: the font from cdn\.example won't load/),
  ])
})
