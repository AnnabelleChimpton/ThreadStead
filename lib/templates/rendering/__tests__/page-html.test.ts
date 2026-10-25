/**
 * The parts of a page with no component become HTML the browser parses back
 * into the same DOM (page-html.ts). The goldens and preview-parity check
 * whole pages; these pin the rules.
 */
import { collapsePage, htmlOf } from '../page-html'
import type { PageForRender } from '../page-artifact'
import type { PageTreeNode } from '../page-tree'

/** As the browser parses it into an element */
const parsed = (html: string) => {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}
const page = (tree: PageTreeNode[], islandIds: string[] = []): PageForRender => ({
  tree,
  islands: islandIds.map((id) => ({ id, component: 'Guestbook', props: {} })) as never,
  ast: {},
})
const island = (id: string, c?: PageTreeNode[]) => ({ t: 'div', a: [['data-island', id], ['data-component', 'guestbook']] as Array<[string, string]>, ...(c && { c }) })

test('text and attribute values stay text: nothing in them becomes markup', () => {
  const root = parsed(htmlOf([{ t: 'p', a: [['title', 'say "hi" & <b>']], c: ['1 < 2 & <script>x</script>'] }]))
  expect(root.querySelector('script, b')).toBeNull()
  expect(root.querySelector('p')!.textContent).toBe('1 < 2 & <script>x</script>')
  expect(root.querySelector('p')!.getAttribute('title')).toBe('say "hi" & <b>')
})

test("a <pre>'s first blank line survives the parser dropping one", () => {
  expect(parsed(htmlOf([{ t: 'pre', c: ['\nindented'] }])).querySelector('pre')!.textContent).toBe('\nindented')
})

test('void elements have no end tag; SVG keeps its case', () => {
  expect(htmlOf([{ t: 'br' }, { t: 'svg', a: [['viewBox', '0 0 1 1']], svg: 1, c: [{ t: 'linearGradient', svg: 1 }] }])).toBe(
    '<br><svg viewBox="0 0 1 1"><linearGradient></linearGradient></svg>'
  )
})

test('a page with no components is all HTML, and says whether it has a <main>', () => {
  const out = collapsePage(page([{ t: 'main', c: ['hi'] }]))
  expect(out).toMatchObject({ tree: [], html: '<main>hi</main>', hasMain: true })
})

test('only the parts holding no component become HTML; components and what is in them stay', () => {
  const out = collapsePage(page([{ t: 'section', c: [{ t: 'p', c: ['still'] }, island('i1', [{ t: 'b', c: ['inside'] }])] }, { t: 'aside', c: ['static'] }], ['i1']))
  expect(out.tree).toEqual([
    { t: 'section', c: [{ t: 'p', h: 'still' }, island('i1', [{ t: 'b', c: ['inside'] }])] },
    { t: 'aside', h: 'static' },
  ])
})

test('form controls whose value React keeps stay React elements', () => {
  const select = { t: 'select', c: [{ t: 'option', a: [['selected', '']] as Array<[string, string]>, c: ['a'] }] }
  const out = collapsePage(page([select, island('i1')], ['i1']))
  expect(out.tree[0]).toEqual(select)
})

test('a placeholder whose component was pruned for this viewer is plain HTML', () => {
  const out = collapsePage(page([{ t: 'div', c: [island('gone', ['x'])] }, island('i1')], ['i1']))
  expect(out.tree[0]).toMatchObject({ t: 'div', h: expect.stringContaining('data-island="gone"') })
})
