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
    // The wrapper <div> the parser keeps around a single top-level tag, then
    // table > tr > td for each level, then the <p>
    expect(result.validation?.stats.maxDepth).toBe(1 + 12 * 3 + 1)
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
      /^Your page is 200 KB of HTML; the most is 200 KB\. Big <style> blocks can move to the CSS tab/
    )
  })

  it('tags', () => {
    failsWith(
      range(TEMPLATE_LIMITS.maxElements + 1).map(() => '<b>x</b>').join(''),
      /^Your page has 10,00\d tags; the most is 10,000\. Try trimming a long list or table\.$/
    )
  })

  it('nesting', () => {
    const levels = TEMPLATE_LIMITS.maxDepth + 1
    failsWith(
      `${'<div>'.repeat(levels)}deep${'</div>'.repeat(levels)}`,
      /^Your page has tags nested 6\d deep; the most is 60\. Look for tags that were opened but never closed/
    )
  })

  it('components', () => {
    failsWith(
      range(TEMPLATE_LIMITS.maxComponents + 1).map(() => '<Bio />').join('\n'),
      /^Your page uses 401 components; the most is 400\. Try removing a few\.$/
    )
  })
})
