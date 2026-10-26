/**
 * @jest-environment node
 *
 * Keys for games: OnKeyUp with OnKeyPress tells a page a key is held, an
 * If around an OnInterval pauses it, scroll="false" keeps arrows and Space
 * from scrolling the page, and nothing fires while someone types. Compiled,
 * server-rendered, hydrated in a browser DOM and pressed, as a visit goes.
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
      await settle(200)
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



const key = (dom: JSDOM, type: 'keydown' | 'keyup', name: string, on?: Element | null) => {
  const event = new dom.window.KeyboardEvent(type, { key: name, bubbles: true, cancelable: true })
  ;(on ?? dom.window.document.body).dispatchEvent(event)
  return event
}

const HOLD = `<div>
<Var name="x" type="number" initial="0" />
<Var name="right" type="boolean" initial="false" />
<p id="x"><ShowVar name="x" /></p>
<input type="text" class="box">
<OnKeyPress keyName="ArrowRight" scroll="false"><Set var="right" value="true" /></OnKeyPress>
<OnKeyUp keyName="ArrowRight"><Set var="right" value="false" /></OnKeyUp>
<If data="$vars.right">
  <OnInterval milliseconds="50"><Set var="x" expression="x + 1" /></OnInterval>
</If>
</div>`

test('a key held down moves something on a timer, which stops when the key comes up', async () => {
  await visit(HOLD, async ({ dom, text }) => {
    const down = key(dom, 'keydown', 'ArrowRight')
    expect(down.defaultPrevented).toBe(true) // scroll="false": the page stays put
    await settle(400)
    key(dom, 'keyup', 'ArrowRight')
    await settle(60)
    const moved = Number(text('x'))
    expect(moved).toBeGreaterThan(2)
    await settle(300)
    expect(Number(text('x'))).toBe(moved) // the If took the timer away
  })
})

test('typing in a box neither moves it nor keeps the key from typing', async () => {
  await visit(HOLD, async ({ $, dom, text }) => {
    const down = key(dom, 'keydown', 'ArrowRight', $('.box'))
    expect(down.defaultPrevented).toBe(false)
    await settle(200)
    key(dom, 'keyup', 'ArrowRight', $('.box'))
    expect(text('x')).toBe('0')
  })
})

test('without scroll="false" an arrow key still scrolls the page', async () => {
  await visit(HOLD.replace(' scroll="false"', ''), async ({ dom }) => {
    expect(key(dom, 'keydown', 'ArrowRight').defaultPrevented).toBe(false)
    key(dom, 'keyup', 'ArrowRight')
  })
})
