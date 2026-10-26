/**
 * @jest-environment node
 *
 * OnSwipe (element-events.tsx useSwipe): a finger, pen or mouse drag
 * across the element it sits in or a target, one way or any, not a click
 * too, and touch-action so the page still scrolls the other way. Compiled,
 * server-rendered, hydrated in a browser DOM and swiped, as a visit goes.
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





let stamp = 1000
/** A pointer from (x1, y1) to (x2, y2), as the browser sends it */
function swipe(dom: JSDOM, on: Element, [x1, y1]: number[], [x2, y2]: number[], pointerType = 'touch') {
  const pointer = (type: string, x: number, y: number) => {
    const event = new dom.window.MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0 })
    Object.defineProperties(event, { pointerId: { value: 7 }, isPrimary: { value: true }, pointerType: { value: pointerType }, timeStamp: { value: (stamp += 100) } })
    return event
  }
  on.dispatchEvent(pointer('pointerdown', x1, y1))
  on.dispatchEvent(pointer('pointerup', x2, y2))
}

const PAD = `<div>
<Var name="x" type="number" initial="0" />
<Var name="clicks" type="number" initial="0" />
<p id="x"><ShowVar name="x" /></p>
<p id="clicks"><ShowVar name="clicks" /></p>
<div class="pad">
  <OnSwipe direction="left"><Decrement var="x" /></OnSwipe>
  <OnSwipe direction="right"><Increment var="x" /></OnSwipe>
  <OnClick><Increment var="clicks" /></OnClick>
  <span class="inside">Swipe me</span>
</div>
</div>`

test('swiping left and right across it, from anywhere inside', async () => {
  await visit(PAD, async ({ $, dom, text }) => {
    const pad = $('.pad')!
    swipe(dom, $('.inside')!, [100, 50], [200, 60])
    await settle()
    expect(text('x')).toBe('1')
    swipe(dom, pad, [200, 50], [40, 30])
    swipe(dom, pad, [200, 50], [40, 30])
    await settle()
    expect(text('x')).toBe('-1')
    // Too short, or mostly up and down: not a left or right swipe
    swipe(dom, pad, [100, 50], [115, 50])
    swipe(dom, pad, [100, 50], [130, 200])
    await settle()
    expect(text('x')).toBe('-1')
  })
})

test("left and right only, so the page still scrolls up and down over it", async () => {
  await visit(PAD, async ({ $ }) => {
    expect($('.pad')!.style.touchAction).toBe('pan-y')
  })
  await visit(PAD.replace('direction="left"', 'direction="up"'), async ({ $ }) => {
    expect($('.pad')!.style.touchAction).toBe('none')
  })
})

test("a mouse drag that swipes isn't a click as well; a tap still is", async () => {
  await visit(PAD, async ({ $, dom, text }) => {
    const pad = $('.pad')!
    swipe(dom, pad, [100, 50], [200, 50], 'mouse')
    click(pad)
    await settle()
    expect(text('x')).toBe('1')
    expect(text('clicks')).toBe('0')
    await settle(20)
    click(pad)
    await settle()
    expect(text('clicks')).toBe('1')
  })
})

test('target="#…" for a picture, which holds nothing; no direction is any way', async () => {
  const source = `<Var name="n" type="number" initial="0" />
<p id="n"><ShowVar name="n" /></p>
<img id="cat" src="https://example.com/cat.png" alt="A cat">
<OnSwipe target="#cat"><Increment var="n" /></OnSwipe>`
  await visit(source, async ({ $, dom, text }) => {
    const cat = $('#user-content-cat')!
    expect(cat.style.touchAction).toBe('none')
    swipe(dom, cat, [10, 10], [10, 90])
    swipe(dom, cat, [10, 10], [90, 10])
    swipe(dom, $('#user-content-n')!, [10, 10], [90, 10])
    await settle()
    expect(text('n')).toBe('2')
  })
})

test('the editor says when an OnSwipe has nothing to swipe across', () => {
  expect(compileTemplateToArtifacts('<Var name="x" type="number" initial="0" />\n<OnSwipe direction="left"><Increment var="x" /></OnSwipe>').warnings).toContainEqual(
    expect.stringMatching(/^Line 2: <OnSwipe> sits at the top of the page.*swipe across/)
  )
})
