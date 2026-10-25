/**
 * The page's class names that the site's own CSS styles, found the way the
 * preview finds them: a site rule has to match an element of the page.
 */
import { classClashWarnings, siteClassClashes } from '../class-clashes'

function page(siteCss: string, pageCss: string, html: string) {
  document.head.innerHTML = `<style id="preview-site-css">${siteCss}</style><style id="advanced-template-css">${pageCss}</style>`
  document.body.innerHTML = `<div data-template-root>${html}</div><nav data-site-chrome><a class="hidden">x</a></nav>`
}

test("names the site's rules match on the page's own elements, in the page's order", () => {
  page(
    `.hidden { display: none } @media (min-width: 1px) { .container { max-width: 40rem } } .card:hover { color: red } .flex { display: flex }`,
    `.mine { color: blue } .grid { display: grid }`,
    `<div class="container"><p class="mine hidden">a</p><span class="card">b</span><b class="grid">c</b></div>`
  )
  expect(siteClassClashes(document)).toEqual(['container', 'hidden', 'card'])
})

test("rules the site keeps off pages, components' markup, chrome and the site's own names don't count", () => {
  page(
    `.btn:where(:not([data-template-root] *)) { color: red } .thread-surface { background: tan } .ts-x, .panel { color: red }`,
    '',
    `<button class="btn">a</button><div class="thread-surface ts-x">b</div><ts-island><div class="panel">c</div></ts-island>`
  )
  expect(siteClassClashes(document)).toEqual([])
})

test('the names go on the first line each is used, one warning a line', () => {
  const source = '<main>\n<div class="box  container">\n<p class="hidden flex">x</p>\n<p class="container-ish">y</p>\n</main>'
  expect(classClashWarnings(source, ['container', 'hidden', 'flex', 'grid'])).toEqual([
    `The class "grid" gets the site's styles as well as yours, because the site uses that name too. Another name keeps it yours.`,
    `Line 2: The class "container" gets the site's styles as well as yours, because the site uses that name too. Another name keeps it yours.`,
    `Line 3: The classes "hidden" and "flex" get the site's styles as well as yours, because the site uses those names too. Other names keep them yours.`,
  ])
  expect(classClashWarnings(source, [])).toEqual([])
})
