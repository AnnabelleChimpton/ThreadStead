/**
 * @jest-environment node
 *
 * OnClick, OnHover, OnMouseEnter and OnMouseLeave inside any element, or on
 * target="…" (components/features/templates/state/events/element-events.tsx),
 * the way a visit goes: compiled, server-rendered with no window, hydrated in
 * a browser DOM, then clicked and pressed. The first page is the owner's
 * welcome screen written without a Button: a picture in a div that lets you in.
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

const WELCOME = `<div class="main-content">
  <Var name="buttonPressed" type="boolean" initial="false" />
  <If data="$vars.buttonPressed" not>
    <div class="welcome-box">
      <h1>Welcome</h1>
      <div class="welcome-button">
        <OnClick><Set var="buttonPressed" value="true" /></OnClick>
        <img src="https://example.com/go.png" alt="Go Button">
      </div>
    </div>
  </If>
  <If data="$vars.buttonPressed">
    <p id="inside">The rest of my page</p>
  </If>
</div>`

test('a picture in a div, with an OnClick, lets you in: a click, Enter or Space, announced as a button', async () => {
  for (const how of ['click', 'Enter', ' ']) {
    await visit(WELCOME, async ({ $ }) => {
      const door = $('.welcome-button')!
      expect(door.getAttribute('role')).toBe('button')
      expect(door.getAttribute('tabindex')).toBe('0')
      expect(door.hasAttribute('data-ts-clickable')).toBe(true)
      expect($('#user-content-inside')).toBeNull()
      if (how === 'click') click(door.querySelector('img'))
      else expect(press(door, how).defaultPrevented).toBe(how === ' ')
      await until(() => !!$('#user-content-inside'))
      expect($('#user-content-inside')?.textContent).toBe('The rest of my page')
      expect($('.welcome-button')).toBeNull()
    })
  }
})

test('the server renders a hidden marker where the OnClick is, and nothing more', async () => {
  const { html } = await visit(WELCOME, async () => {})
  expect(html).toMatch(/<div class="welcome-button"[^>]*>\s*<ts-island><!--\$--><span hidden="" data-ts-event="" style="display:none"><\/span><!--\/\$--><\/ts-island>/)
  // Nothing added on the server: tabindex and role come once it's live
  expect(html).not.toMatch(/data-ts-clickable|role="button"/)
})

test('her Button version keeps working the same', async () => {
  const source = WELCOME.replace(
    /<div class="welcome-button">[\s\S]*?<\/div>/,
    '<div class="welcome-button"><Button><OnClick><Set var="buttonPressed" value="true" /></OnClick><img src="https://example.com/go.png" alt="Go Button"></Button></div>'
  )
  const html = renderToString(page(source))
  expect(html).not.toContain('data-ts-event')
  const dom = new JSDOM(`<!doctype html><html><body><div id="app">${html}</div></body></html>`, { url: 'http://localhost/resident/pat', pretendToBeVisual: true, virtualConsole: new VirtualConsole() })
  const leave = enterBrowser(dom)
  try {
    const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client')
    const app = hydrateRoot(dom.window.document.getElementById('app')!, page(source))
    const $ = (selector: string) => dom.window.document.querySelector<HTMLElement>(selector)
    await settle()
    const button = $('.welcome-button button')!
    expect(button.hasAttribute('role')).toBe(false)
    expect(button.hasAttribute('data-ts-clickable')).toBe(false)
    await until(() => {
      click(button)
      return !!$('#user-content-inside')
    })
    expect($('#user-content-inside')).not.toBeNull()
    app.unmount()
  } finally {
    leave()
    dom.window.close()
  }
})

test('a card: "this" is the card, and a Button or link inside it runs only its own', async () => {
  const source = `<Var name="cards" type="number" initial="0" />
<Var name="buttons" type="number" initial="0" />
<div id="card" class="card">
  <OnClick>
    <Increment var="cards" />
    <AddClass target="this" className="seen" />
    <ConditionalAttr element="this" attribute="data-picked" when="$vars.cards >= 0" />
  </OnClick>
  <p id="words">A card</p>
  <Button><OnClick><Increment var="buttons" /></OnClick>Inner</Button>
  <a href="#nowhere" id="link">a link</a>
  <div id="inner"><OnClick><Increment var="buttons" /></OnClick>inner card</div>
</div>
<p id="out"><ShowVar name="cards" />|<ShowVar name="buttons" /></p>`
  await visit(source, async ({ $, text }) => {
    click($('#user-content-words'))
    await until(() => text('out') === '1|0')
    expect(text('out')).toBe('1|0')
    await until(() => $('#user-content-card')!.classList.contains('seen'))
    expect($('#user-content-card')!.classList.contains('seen')).toBe(true)
    expect($('#user-content-card')!.getAttribute('data-picked')).toBe('true')

    click($('#user-content-card button'))
    await until(() => text('out') === '1|1')
    click($('#user-content-link'))
    click($('#user-content-inner'))
    await until(() => text('out') === '1|2')
    expect(text('out')).toBe('1|2')

    // Enter on the button inside is the button's, not the card's
    press($('#user-content-card button'), 'Enter')
    press($('#user-content-inner'), ' ')
    await until(() => text('out') === '1|3')
    await settle()
    expect(text('out')).toBe('1|3')
  })
})

test('target="…" makes a picture clickable, and something that shows up later too', async () => {
  const source = `<Var name="cats" type="number" initial="0" />
<Var name="shown" type="boolean" initial="false" />
<img id="cat" src="https://example.com/cat.png" alt="Pet the cat">
<OnClick target="#cat"><Increment var="cats" /><AddClass target="this" className="petted" /></OnClick>
<OnClick target=".late"><Increment var="cats" /></OnClick>
<Button><OnClick><Toggle var="shown" /></OnClick>Show</Button>
<If data="$vars.shown"><p class="late" id="late">late</p></If>
<p id="out"><ShowVar name="cats" /></p>`
  await visit(source, async ({ $, text }) => {
    const cat = $('#user-content-cat')!
    expect([cat.getAttribute('role'), cat.getAttribute('tabindex')]).toEqual(['button', '0'])
    click(cat)
    await until(() => text('out') === '1')
    expect(press(cat, ' ').defaultPrevented).toBe(true)
    await until(() => text('out') === '2')
    await until(() => cat.classList.contains('petted'))
    expect(cat.classList.contains('petted')).toBe(true)

    click($('button'))
    await until(() => !!$('#user-content-late'))
    const late = $('#user-content-late')!
    click(late)
    await until(() => text('out') === '3')
    expect(text('out')).toBe('3')
    // Keyboard too, once the page shows it
    await until(() => late.getAttribute('tabindex') === '0')
    expect(late.getAttribute('role')).toBe('button')
    press(late, 'Enter')
    await until(() => text('out') === '4')
    expect(text('out')).toBe('4')
  })
})

test('the mouse events work inside any element and on a target; Checkbox takes an OnChange', async () => {
  const source = `<Var name="sign" type="string" initial="Closed" />
<Var name="boops" type="number" initial="0" />
<Var name="ticked" type="boolean" initial="false" />
<Var name="ticks" type="number" initial="0" />
<section id="shop">
  <OnMouseEnter><Set var="sign" value="Open" /></OnMouseEnter>
  <OnMouseLeave><Set var="sign" value="Closed" /></OnMouseLeave>
  <span id="door">door</span>
</section>
<p class="snoot" id="snoot"><b id="nose">nose</b></p>
<OnHover target=".snoot"><Increment var="boops" /></OnHover>
<Checkbox var="ticked" label="Watered"><OnChange><Increment var="ticks" /></OnChange></Checkbox>
<p id="out"><ShowVar name="sign" />|<ShowVar name="boops" />|<ShowVar name="ticks" /></p>
<p id="anchor">x<OnClick><Increment var="ticks" /></OnClick></p>`
  await visit(source, async ({ $, dom, text }) => {
    const { MouseEvent } = dom.window
    const shop = $('#user-content-shop')!
    // Hover alone doesn't make anything a button
    expect(shop.hasAttribute('role')).toBe(false)
    expect(shop.hasAttribute('tabindex')).toBe(false)
    shop.dispatchEvent(new MouseEvent('mouseenter'))
    await until(() => text('out').startsWith('Open'))
    expect(text('out')).toBe('Open|0|0')
    shop.dispatchEvent(new MouseEvent('mouseleave'))
    await until(() => text('out').startsWith('Closed'))

    const snoot = $('#user-content-snoot')!
    const nose = $('#user-content-nose')!
    snoot.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: dom.window.document.body }))
    // Moving onto its own child isn't coming in again
    nose.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: snoot }))
    await until(() => text('out') === 'Closed|1|0')
    await settle()
    expect(text('out')).toBe('Closed|1|0')

    click($('input[type="checkbox"]'))
    await until(() => text('out') === 'Closed|1|1')
    expect(text('out')).toBe('Closed|1|1')
  })
})
