/**
 * @jest-environment node
 *
 * scripts/convert-visual-builder-pages.ts rewrites old Visual Builder pages
 * (data-x / data-y on components) into plain HTML and CSS, so the positioning
 * code can be deleted. Rendered through the real compile and the real server
 * renderer, a converted page must put every block in the same box as the
 * positioning code does today. The fixture covers every sizing category, a
 * nested positioned component, a responsive one and data-component-size.
 * Delete this test with the positioning code.
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))

import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { convertVisualBuilderPositioning } from '@/lib/templates/migrations/visual-builder-positioning'
import { AppProviders, OWNER_ID, residentData } from '../ssr-golden-support'

const PAGE = fs.readFileSync(path.join(__dirname, '../fixtures/visual-builder-page.html'), 'utf8')

async function compile(source: string) {
  const result = await compileForEditor(source)
  if (!result.ok) throw new Error(JSON.stringify(result.body))
  return JSON.parse(JSON.stringify(result.compiled))
}

function render(compiled: unknown) {
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate: pageForRender(compiled) } }
  const realError = console.error
  console.error = () => {}
  try {
    const html = renderToString(
      <AppProviders>
        <AdvancedProfileRenderer user={user} residentData={residentData('u_visitor')} />
      </AppProviders>
    )
    return new JSDOM(`<body>${html}</body>`).window.document.body
  } finally {
    console.error = realError
  }
}

/** Every absolutely positioned box, in page order, with what it's sized by */
function boxes(root: Element) {
  return Array.from(root.querySelectorAll<HTMLElement>('[style]'))
    .filter((el) => el.style.position === 'absolute')
    .map((el) => {
      const s = el.style
      return [s.left, s.top, s.zIndex, s.width, s.height, s.minWidth, s.minHeight, s.maxWidth, s.maxHeight].join('|')
    })
}

const islandsWithPositioning = (compiled: { islands: Array<{ props: Record<string, unknown> }> }) =>
  compiled.islands.filter((island) => island.props._positioning || island.props._size).length

test('a converted page puts every block in the same box, with no positioning data left', async () => {
  const converted = convertVisualBuilderPositioning(PAGE)
  const before = await compile(PAGE)
  const after = await compile(converted.source)

  expect(islandsWithPositioning(before)).toBeGreaterThan(0)
  expect(islandsWithPositioning(after)).toBe(0)
  expect(after.islands.length).toBe(before.islands.length)
  const beforeBoxes = boxes(render(before))
  expect(beforeBoxes.length).toBeGreaterThanOrEqual(12)
  expect(boxes(render(after))).toEqual(beforeBoxes)
  expect(converted.source).not.toMatch(/data-(x|y|width|height|responsive|breakpoints|component-size)=/)
})

test("it says what it couldn't keep exactly", () => {
  const { warnings } = convertVisualBuilderPositioning(PAGE)
  expect(warnings.some((w) => w.startsWith('<StickyNote>') && /vertically centred/.test(w))).toBe(true)
  expect(warnings.some((w) => /<FloatingBadge> attribute position="top-right"/.test(w))).toBe(true)
})

test('converting twice changes nothing, and a page without positions is left alone', () => {
  const once = convertVisualBuilderPositioning(PAGE).source
  expect(convertVisualBuilderPositioning(once)).toEqual({ source: once, changes: [], warnings: [] })
  const plain = '<main><h1>Hi</h1><Guestbook /><p style="position: absolute; top: 4px">kept</p></main>'
  expect(convertVisualBuilderPositioning(plain)).toEqual({ source: plain, changes: [], warnings: [] })
})
