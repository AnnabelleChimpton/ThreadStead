/**
 * @jest-environment node
 *
 * A component inside a <p> never breaks the page. A browser ends a paragraph
 * at the first box inside it (a <div>, <form>, heading…), so when a
 * component drew one, the page the browser built didn't match the server's
 * and hydration failed for the whole page (template audit 01 #4). The
 * compiler now turns such a <p> into a <div>; components on
 * PARAGRAPH_SAFE_COMPONENTS stay inside the paragraph.
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))
// As in ssr-golden.test.tsx: PixelIcon's SVG import is a file stub under jest
jest.mock('@/components/ui/PixelIcon', () => {
  const React = jest.requireActual('react')
  const PixelIcon = ({ size = 24 }: { size?: number }) =>
    React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } })
  return { PixelIcon, default: PixelIcon }
})

// The component runtime loads at once, as in Next's server render
jest.mock('next/dynamic', () => require('../sync-dynamic').syncDynamic)

import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { PARAGRAPH_SAFE_COMPONENTS } from '@/lib/templates/compilation/paragraph-safe'
import { AppProviders, residentData, OWNER_ID } from '../ssr-golden-support'

/** The page as a browser parses the server's HTML */
function browserParse(source: string) {
  const a = compileTemplateToArtifacts(source)
  const page = pageForRender(JSON.parse(JSON.stringify({ staticHTML: a.staticHTML, islands: a.islands, ast: a.ast })), { isOwner: true })
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate: page } }
  const html = renderToString(
    <AppProviders>
      <AdvancedProfileRenderer user={user} residentData={residentData(OWNER_ID)} />
    </AppProviders>
  )
  return { document: new JSDOM(html).window.document, warnings: a.warnings }
}

const names = [...componentRegistry.getAllRegistrations().values()].map((r) => r.name)

test.each(names)('<%s> inside a <p>: the paragraph comes through whole', (name) => {
  const { document } = browserParse(`<p id="para">before <${name}></${name}> after</p>`)
  const para = document.getElementById('user-content-para')
  if (!para) return // renders nothing for this viewer with no props
  expect(para.textContent).toContain('after')
  expect(para.tagName).toBe(PARAGRAPH_SAFE_COMPONENTS.has(name) ? 'P' : 'DIV')
})

test('every name on the safe list is a registered component', () => {
  for (const name of PARAGRAPH_SAFE_COMPONENTS) expect(componentRegistry.get(name)?.name).toBe(name)
})

test('the editor says why the paragraph became a <div>', () => {
  const { document, warnings } = browserParse('<p class="note" id="para">Hello <StickyNote>note</StickyNote> there</p>')
  const para = document.getElementById('user-content-para')!
  expect(para.tagName).toBe('DIV')
  expect(para.className).toBe('note')
  expect(warnings.join('\n')).toMatch(/A paragraph \(<p>\) holding <StickyNote> is a <div> on your page/)
})

test('a component whose tag is a prop is inline when it says so', () => {
  expect(browserParse('<p id="para">Hi, I\'m <DisplayName as="span" /></p>').document.getElementById('user-content-para')!.tagName).toBe('P')
  // As a heading (its default) it's a box
  expect(browserParse('<p id="para">Hi, I\'m <DisplayName /></p>').document.getElementById('user-content-para')!.tagName).toBe('DIV')
})

test('a paragraph with only text-like components stays a paragraph, with no message', () => {
  const { document, warnings } = browserParse('<Var name="n" type="number" initial="3" /><p id="para">I have <ShowVar name="n" /> cats</p>')
  expect(document.getElementById('user-content-para')!.tagName).toBe('P')
  expect(warnings.join('\n')).not.toMatch(/A paragraph/)
})
