/**
 * Tidy only changes the spaces at the start of lines (lib/templates/editor/tidy.ts)
 */
import { tidyCss, tidyHtml } from '../tidy'

const sameApartFromIndents = (a: string, b: string) => {
  const strip = (s: string) => s.split('\n').map((line) => line.trimStart()).join('\n')
  expect(strip(a)).toBe(strip(b))
}

test('nests HTML and components two spaces a level', () => {
  const messy = `<main>
<h1>Hi</h1>
      <RetroCard>
<p>You rolled <ShowVar name="roll" />.</p>
<img src="a.png" alt="">
<br>
            </RetroCard>
</main>`
  expect(tidyHtml(messy)).toBe(`<main>
  <h1>Hi</h1>
  <RetroCard>
    <p>You rolled <ShowVar name="roll" />.</p>
    <img src="a.png" alt="">
    <br>
  </RetroCard>
</main>`)
})

test("an old page's unclosed <li>, <p> and <td> don't pile up", () => {
  const old = `<ul>
<li>one
<li>two
</ul>
<p>first
<p>second
<table>
<tr><td>a
<tr><td>b
</table>`
  expect(tidyHtml(old)).toBe(`<ul>
  <li>one
  <li>two
</ul>
<p>first
<p>second
<table>
  <tr><td>a
  <tr><td>b
</table>`)
})

test('leaves <pre>, <textarea>, <style>, comments and multi-line tags as written', () => {
  const page = `<div>
<pre>
    keep
  these
</pre>
<textarea>
   spaces
</textarea>
<style>
      .x { color: red }
</style>
<!-- a comment
      over lines -->
<a href="#"
      title="lined up">link</a>
</div>`
  const tidied = tidyHtml(page)
  sameApartFromIndents(tidied, page)
  for (const line of ['    keep', '  these', '   spaces', '      .x { color: red }', '      over lines -->', '      title="lined up">link</a>']) {
    expect(tidied.split('\n')).toContain(line)
  }
})

test('CSS nests by braces, comments and strings untouched', () => {
  const messy = `@media (max-width: 600px) {
.a {
color: red;
content: "{";
}
}
/* a comment
     kept */
.b { margin: 0 }`
  const tidied = tidyCss(messy)
  sameApartFromIndents(tidied, messy)
  expect(tidied).toBe(`@media (max-width: 600px) {
  .a {
    color: red;
    content: "{";
  }
}
/* a comment
     kept */
.b { margin: 0 }`)
})

test('already tidy stays the same', () => {
  const tidy = '<main>\n  <p>hi</p>\n</main>'
  expect(tidyHtml(tidy)).toBe(tidy)
  expect(tidyCss('.a {\n  color: red;\n}')).toBe('.a {\n  color: red;\n}')
})

describe('elements the page makes keep their spaces (bug bash 2026-10-26)', () => {
  const art = '<div class="art">\n  /\\_/\\\n ( o.o )\n  > ^ <\n</div>'
  test('by a class in the page CSS', () => {
    expect(tidyHtml(art, '.art { white-space: pre; font-family: monospace }')).toBe(art)
  })
  test('by its own style, or a <style> in the HTML', () => {
    const styled = '<div style="white-space: pre-wrap">\n   indented\n      more\n</div>'
    expect(tidyHtml(styled)).toBe(styled)
    expect(tidyHtml(`<style>.art { white-space: pre }</style>\n${art}`)).toBe(`<style>.art { white-space: pre }</style>\n${art}`)
  })
  test('other divs are still tidied', () => {
    expect(tidyHtml('<div class="box">\n      text\n</div>', '.art { white-space: pre }')).toBe('<div class="box">\n  text\n</div>')
  })
})
