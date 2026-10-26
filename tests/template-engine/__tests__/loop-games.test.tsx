/**
 * @jest-environment node
 *
 * Games made of a ForEach: a loop's names in the calculations its clicks
 * make (lib/templates/state/loop-names.ts), its {item} and {i} in class and
 * style, and loops inside loops seeing the outer one's names. Compiled,
 * server-rendered, hydrated in a browser DOM and clicked, as a visit goes.
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))
jest.mock('@/components/ui/PixelIcon', () => {
  const React = jest.requireActual('react')
  const PixelIcon = ({ size = 24 }: { size?: number }) => React.createElement('span', { style: { width: size, height: size } })
  return { PixelIcon, default: PixelIcon }
})
jest.mock('next/dynamic', () => require('../sync-dynamic').syncDynamic)

import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM, VirtualConsole } from 'jsdom'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { AppProviders, residentData, OWNER_ID, enterBrowser } from '../ssr-golden-support'

function page(source: string) {
  const a = compileTemplateToArtifacts(source)
  expect(a.warnings).toEqual([])
  const compiled = pageForRender(JSON.parse(JSON.stringify({ mode: 'advanced', staticHTML: a.staticHTML, islands: a.islands, ast: a.ast })), { isOwner: false })
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate: compiled } }
  return (
    <AppProviders>
      <AdvancedProfileRenderer user={user} residentData={residentData(null)} />
    </AppProviders>
  )
}

const settle = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms))

/** Until `ready`, for up to 2 s (components hydrate in their own time when the machine is busy) */
async function until(ready: () => boolean) {
  for (let waited = 0; !ready() && waited < 2000; waited += 20) await settle(20)
}

/** Server HTML, then the page hydrated in a browser; `during` gets the page while it's open */
async function visit(source: string, during: (p: { $: (selector: string) => HTMLElement | null; dom: JSDOM; text: (id: string) => string }) => Promise<void>) {
  const html = renderToString(page(source))
  const dom = new JSDOM(`<!doctype html><html><body><div id="app">${html}</div></body></html>`, {
    url: 'http://localhost/resident/pat',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  })
  const leave = enterBrowser(dom)
  const hydrationErrors: unknown[] = []
  try {
    const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client')
    const app = hydrateRoot(dom.window.document.getElementById('app')!, page(source), {
      onRecoverableError: (error) => hydrationErrors.push(String(error)),
    })
    const $ = (selector: string) => dom.window.document.querySelector<HTMLElement>(selector)
    const text = (id: string) => $(`#user-content-${id}`)?.textContent ?? ''
    // Hydrated, and the events listening
    try {
      await until(() => !!$('[data-ts-clickable]'))
      await settle()
      await during({ $, dom, text })
    } finally {
      app.unmount()
    }
    expect(hydrationErrors).toEqual([])
    return { html, dom }
  } finally {
    leave()
    dom.window.close()
  }
}

const click = (element: HTMLElement | null) => element!.dispatchEvent(new element!.ownerDocument.defaultView!.MouseEvent('click', { bubbles: true, cancelable: true }))
const press = (element: HTMLElement | null, key: string) => {
  const event = new element!.ownerDocument.defaultView!.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  element!.dispatchEvent(event)
  return event
}


const cells = (dom: JSDOM) => [...dom.window.document.querySelectorAll<HTMLElement>('.cell')]

const TIC_TAC_TOE = `<div>
<Var name="board" type="array" initial='["","","","","","","","",""]' />
<Var name="turn" type="string" initial="X" />
<p id="turn"><ShowVar name="turn" /></p>
<div class="grid">
<ForEach var="board" item="cell" index="i">
  <div class="cell mark-{cell}" style="left: calc({i} * 2em); top: 1px">
    <OnClick>
      <If data="cell" equals="">
        <Set var="board" expression="board.slice(0, i).concat([turn]).concat(board.slice(i + 1))" />
        <Set var="turn" expression="turn == 'X' ? 'O' : 'X'" />
      </If>
    </OnClick>
    {cell}
  </div>
</ForEach>
</div>
</div>`

test("a click's calculation reads the loop's names as written: i, not only $vars.i", async () => {
  await visit(TIC_TAC_TOE, async ({ dom, text }) => {
    for (const n of [0, 4, 4, 8]) {
      click(cells(dom)[n])
      await settle()
    }
    // A bare i was empty: slice(0, i) kept the whole board and it doubled
    expect(cells(dom)).toHaveLength(9)
    expect(cells(dom).map((cell) => cell.textContent!.trim() || '.').join('')).toBe('X...O...X')
    expect(text('turn')).toBe('O')
  })
})

test('{item} and {i} in class and style, there from the server render on', async () => {
  const { html } = await visit(TIC_TAC_TOE, async ({ dom }) => {
    expect(cells(dom)[3].style.left).toBe('calc(6em)') // calc(3 * 2em), worked out
    expect(cells(dom)[3].style.top).toBe('1px')
    click(cells(dom)[3])
    await settle()
    expect(cells(dom)[3].className).toBe('cell mark-X')
  })
  expect(html).toContain('left:calc(1 * 2em)')
  expect(html).not.toContain('{i}')
})

test("a list item can't bring a url() into a style", async () => {
  const source = `<Var name="looks" type="array" initial='["red", "url(https://example.com/x.png)", "\\\\75 rl(x)"]' />
<ForEach var="looks" item="look"><div class="swatch" style="background: {look}; width: 1em"></div></ForEach>`
  await visit(source.replace('<ForEach', '<p class="ts-x"><OnClick><Set var="looks" value="[]" /></OnClick>x</p><ForEach'), async ({ dom }) => {
    const swatches = [...dom.window.document.querySelectorAll<HTMLElement>('.swatch')]
    expect(swatches.map((swatch) => swatch.style.background)).toEqual(['red', '', ''])
    expect(swatches.every((swatch) => swatch.style.width === '1em')).toBe(true)
  })
})

test("a loop inside a loop sees the outer one's names, with scopes of its own per row", async () => {
  const source = `<Var name="rows" type="array" initial="[0,1]" />
<Var name="cols" type="array" initial="[0,1,2]" />
<Var name="picked" type="string" initial="" />
<p id="picked"><ShowVar name="picked" /></p>
<ForEach var="rows" item="r"><div class="row">
  <ForEach var="cols" item="c"><span class="cell"><OnClick><Set var="picked" expression="r + '-' + c" /></OnClick>{r}{c}</span></ForEach>
</div></ForEach>`
  await visit(source, async ({ dom, text }) => {
    expect(cells(dom).map((cell) => cell.textContent)).toEqual(['00', '01', '02', '10', '11', '12'])
    click(cells(dom)[5])
    await settle()
    expect(text('picked')).toBe('1-2')
    click(cells(dom)[1])
    await settle()
    expect(text('picked')).toBe('0-1')
  })
})
