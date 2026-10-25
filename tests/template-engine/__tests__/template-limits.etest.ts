/**
 * GOLDEN: the compile limits fit ordinary old-web pages.
 *
 * Before 2026-10-20 a 13 KB table of 150 rows failed the node limit (text
 * between tags counted), twelve nested layout tables failed the depth limit
 * (the parser's <tbody> counted), and anything over 100 KB failed even
 * though the save allows 200 KB. Each realistic page here must compile, and
 * a page just over each limit must fail with the plain message.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import { compileTemplate } from '@/lib/templates/compilation/template-parser'
import { TEMPLATE_LIMITS } from '@/lib/templates/compilation/template-limits'
import { MAX_TEMPLATE_CHARS } from '@/lib/templates/limits'
import { sanitizeCustomHTML } from '@/lib/templates/compilation/custom-html'

const range = (count: number) => Array.from({ length: count }, (_, i) => i + 1)

const linksPage = `<h1>My links</h1>
<p>Sites I like, roughly in the order I found them.</p>
<ul>
${range(400).map((i) => `  <li><a href="https://example${i}.neocities.org/">Example site number ${i}</a> - a small page about things</li>`).join('\n')}
</ul>`

const tablePage = `<h2>Everything I own on VHS</h2>
<table border="1" cellpadding="4">
  <tr><th>#</th><th>Title</th><th>Year</th><th>Notes</th></tr>
${range(150).map((i) => `  <tr>
    <td>${i}</td>
    <td>Tape ${i}</td>
    <td>${1980 + (i % 20)}</td>
    <td>ok</td>
  </tr>`).join('\n')}
</table>`

const journalPage = `<h1>Journal</h1>
${range(150).map((i) => `<div class="entry">
  <h3>Entry ${i}</h3>
  <p>Today I worked on my page again and moved the guestbook to the side. The marquee is back, because of course it is. I also found an old midi I used to love.</p>
  <p>Listening to: something loud. Mood: <i>pretty good</i>. Next time I want to sort out the <b>buttons</b> page and the links.</p>
</div>`).join('\n')}`

const nestedTables = (levels: number): string =>
  levels === 0
    ? '<p>The middle of the page.</p>'
    : `<table width="100%"><tr><td>${nestedTables(levels - 1)}</td></tr></table>`

describe('compile limits fit ordinary pages', () => {
  it.each([
    ['a links page of 400 links', linksPage],
    ['a table of 150 rows', tablePage],
    ['a journal of 150 entries', journalPage],
    ['12 nested layout tables', nestedTables(12)],
  ])('compiles %s', (_name, page) => {
    const result = compileTemplate(page)
    expect(result.errors).toEqual([])
    expect(result.success).toBe(true)
  })

  it('counts tags, not the text between them', () => {
    const result = compileTemplate(tablePage)
    // 1 h2 + 1 table + 1 header row (tr + 4 th) + 150 rows of tr + 4 td
    expect(result.validation?.stats.nodeCount).toBe(1 + 1 + 5 + 150 * 5)
  })

  it('leaves the parser-added <tbody> out of the depth', () => {
    const result = compileTemplate(nestedTables(12))
    // table > tr > td for each level, then the <p> (no wrapper <div> around
    // the page any more: template audit 01 #2)
    expect(result.validation?.stats.maxDepth).toBe(12 * 3 + 1)
  })

  it('matches the save limit on size', () => {
    expect(TEMPLATE_LIMITS.maxChars).toBe(MAX_TEMPLATE_CHARS)
    const justUnder = `<p>${'a'.repeat(MAX_TEMPLATE_CHARS - 7)}</p>`
    expect(justUnder.length).toBe(MAX_TEMPLATE_CHARS)
    expect(compileTemplate(justUnder).success).toBe(true)
  })
})

describe('a page over a limit says so plainly', () => {
  const failsWith = (page: string, message: RegExp) => {
    const result = compileTemplate(page)
    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(message)
    // No emoji, no developer jargon
    expect(result.errors[0]).not.toMatch(/[\u{1F300}-\u{1FAFF}]|limit exceeded|node/iu)
  }

  it('size', () => {
    failsWith(
      `<p>${'a'.repeat(MAX_TEMPLATE_CHARS)}</p>`,
      /^Your page is 500 KB of HTML; the most is 500 KB\. Big <style> blocks can move to the CSS tab/
    )
  })

  it('tags', () => {
    failsWith(
      range(TEMPLATE_LIMITS.maxElements + 1).map(() => '<b>x</b>').join(''),
      /^Your page has 25,00\d tags; the most is 25,000\. Try trimming a long list or table\.$/
    )
  })

  it('nesting', () => {
    const levels = TEMPLATE_LIMITS.maxDepth + 1
    failsWith(
      `${'<div>'.repeat(levels)}deep${'</div>'.repeat(levels)}`,
      /^Your page has tags nested 25\d deep; the most is 256\. Look for tags that were opened but never closed/
    )
  })

  it('an old page that never closes its <font> tags still fits (template audit 01 #18)', () => {
    expect(compileTemplate('text<br><font color=red>word '.repeat(200)).success).toBe(true)
  })

  it('components', () => {
    failsWith(
      range(TEMPLATE_LIMITS.maxComponents + 1).map(() => '<Bio />').join('\n'),
      /^Your page uses 401 components; the most is 400\. Try removing a few\.$/
    )
  })

  it("logic tags don't count as components: they show nothing of their own", () => {
    const button = '<Button><OnClick><Increment var="n" /><ShowToast message="hi" /></OnClick>Wave</Button>'
    const page = '<Var name="n" type="number" initial="0" />\n' + range(TEMPLATE_LIMITS.maxComponents / 2).map(() => button).join('\n')
    expect(compileTemplate(page).success).toBe(true)
  })
})

describe('compiling a big page takes time in proportion to its size', () => {
  // Every tag's line was counted from the top of the page, so compile time
  // grew with the square of the size: a 199 KB page took 2.1 s, 500 KB 12 s,
  // and the server answered nobody else meanwhile (template audit 12 #2)
  const { lineAt } = jest.requireActual('@/lib/templates/compilation/source-scan')

  test('lineAt gives the same lines as counting newlines', () => {
    const source = 'a\nbb\n\nccc\n<p>\nend'
    for (let i = 0; i <= source.length + 2; i++) {
      const counted = source.slice(0, i).split('\n').length
      expect(lineAt(source, i)).toBe(counted)
    }
    expect(lineAt('', 0)).toBe(1)
  })

  test('a page near the size cap compiles in well under a second', () => {
    const big = `<ul>\n${range(3000).map((i) => `<li><a href="https://e${i}.neocities.org/">site ${i}</a></li>`).join('\n')}\n</ul>`
    expect(big.length).toBeLessThan(MAX_TEMPLATE_CHARS)
    const started = performance.now()
    compileTemplate(big)
    expect(performance.now() - started).toBeLessThan(1000)
  })
})

describe('a runaway page is refused before or while parsing (template audit 04 H1)', () => {
  // The parser slows with every level (30,000 unclosed <div>s took 2 s) and
  // the tree conversion overflowed the stack near 3,000, answering
  // "Template parsing failed" instead of the depth limit
  const refusedQuickly = (source: string) => {
    const started = performance.now()
    const result = compileTemplate(source)
    expect(performance.now() - started).toBeLessThan(200)
    expect(result.success).toBe(false)
    return result.errors![0]
  }

  test('deep nesting gets the depth message, however it nests', () => {
    for (const source of ['<div>'.repeat(9000), '<ul><li>'.repeat(5000), '<div>'.repeat(9000) + '</x>'.repeat(9000)]) {
      expect(refusedQuickly(source)).toMatch(/^Your page has tags nested more than 1,024 deep; the most is 256/)
    }
  })

  test('a flood of tags gets the tag message', () => {
    expect(refusedQuickly('<div>'.repeat(60000))).toMatch(/^Your page has 60,000 tags; the most is 25,000/)
  })

  test('the depth guard stays put when the cap goes up: the stack, not the cap, is the limit', () => {
    const cap = TEMPLATE_LIMITS.maxDepth
    Object.assign(TEMPLATE_LIMITS, { maxDepth: 2000 })
    try {
      expect(refusedQuickly('<div>'.repeat(1100))).toMatch(/^Your page has tags nested more than 1,024 deep/)
    } finally {
      Object.assign(TEMPLATE_LIMITS, { maxDepth: cap })
    }
  })

  test("HTML inside a CustomHTMLElement's content is guarded too", () => {
    const started = performance.now()
    expect(sanitizeCustomHTML('<div>'.repeat(9000))).toBe('')
    expect(performance.now() - started).toBeLessThan(200)
  })

  test("old pages' unclosed tags don't count as nesting", () => {
    expect(compileTemplate('<table>' + '<tr><td><font size=2>cell</td></tr>'.repeat(1500) + '</table>').success).toBe(true)
    expect(compileTemplate('<p>para'.repeat(1500)).success).toBe(true)
  })
})
