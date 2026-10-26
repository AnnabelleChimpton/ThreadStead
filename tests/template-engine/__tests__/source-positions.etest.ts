/**
 * Words on the preview: an editor compile marks where each element's words
 * and start tag are in the source the editor holds (data-ts-text,
 * data-ts-at), components and the HTML handed to them included, and every
 * range it gives reads as exactly the text the browser will show. A save's
 * compile marks nothing.
 */
import { decodeHTML } from 'entities'
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'
import type { PageTreeNode } from '@/lib/templates/rendering/page-tree'
import { STARTERS, splitStarter } from '@/lib/templates/starters'

type Marked = { tag: string; component?: string; at?: number; texts: string[]; ranges: string[] }

function marked(nodes: PageTreeNode[] | undefined, out: Marked[] = []): Marked[] {
  for (const node of nodes ?? []) {
    if (typeof node === 'string') continue
    const attr = (name: string) => node.a?.find(([n]) => n === name)?.[1]
    const text = attr('data-ts-text')
    const at = attr('data-ts-at')
    if (text || at) {
      out.push({
        tag: node.t,
        component: attr('data-component'),
        at: at === undefined ? undefined : Number(at),
        texts: (node.c ?? []).filter((c): c is string => typeof c === 'string'),
        ranges: text ? text.split(',') : [],
      })
    }
    marked(node.c, out)
  }
  return out
}

async function compile(source: string, positions = true) {
  const result = await compileForEditor(source, { positions })
  if (!result.ok) throw new Error(JSON.stringify(result.body.errors))
  return marked(result.artifact.tree)
}

/** Each range reads as its text; each tag mark points at that tag */
function check(source: string, marks: Marked[]) {
  let words = 0
  for (const mark of marks) {
    if (mark.ranges.length) expect(mark.ranges).toHaveLength(mark.texts.length)
    mark.ranges.forEach((range, i) => {
      if (range === 'x') return
      const [from, to] = range.split('-').map(Number)
      expect(decodeHTML(source.slice(from, to).replace(/\r\n?/g, '\n'))).toBe(mark.texts[i])
      words++
    })
    // A component's mark is on its placeholder, and points at the component's tag
    const tag = mark.component ?? mark.tag
    if (mark.at !== undefined) expect(source.slice(mark.at, mark.at + 1 + tag.length).toLowerCase()).toBe(`<${tag}`)
  }
  return words
}

test('a page with entities, a pasted <head>, theme options and the site nav taken out', async () => {
  const source = `<!DOCTYPE html>
<html><head><title>Mine</title><meta name="color:Ink" content="#222"></head>
<body>
  <ThreadsteadNavigation />
  <h1 class="t">Tom &amp; Jerry&#39;s page</h1>
  <p>Hello <a href="/x">my&nbsp;friend</a>, welcome.</p>
  <ul><li>one</li><li>two &lt;3</li></ul>
  <RetroCard><p>inside a component</p></RetroCard>
</body></html>`
  const marks = await compile(source)
  expect(check(source, marks)).toBeGreaterThanOrEqual(6)
  const h1 = marks.find((m) => m.tag === 'h1')!
  expect(h1.texts).toEqual(["Tom & Jerry's page"])
  expect(source.slice(...h1.ranges[0].split('-').map(Number) as [number, number])).toBe('Tom &amp; Jerry&#39;s page')
  // HTML handed to a component is marked too, and so is the component's own tag
  const inside = marks.find((m) => m.texts.includes('inside a component'))!
  expect(source.slice(...inside.ranges[0].split('-').map(Number) as [number, number])).toBe('inside a component')
  const card = marks.find((m) => m.component === 'retrocard')!
  expect(source.startsWith('<RetroCard', card.at)).toBe(true)
})

test.each(STARTERS.map((s) => [s.id, splitStarter(s.template).html]))('starter %s: every word maps back', async (_id, html) => {
  const marks = await compile(html)
  expect(check(html, marks)).toBeGreaterThan(0)
})

test("a save's compile marks nothing", async () => {
  const marks = await compile('<h1>Hi</h1><p>there</p>', false)
  expect(marks).toEqual([])
})
