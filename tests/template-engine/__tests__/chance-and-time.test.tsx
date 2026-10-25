/**
 * @jest-environment node
 *
 * random(), pick() and $time on a page of your own HTML, the way a visit
 * goes: server-rendered with no window, hydrated in a browser DOM. The
 * server and the first browser render agree (lowest roll, first pick, no
 * time), then the page goes live: an OnMount's roll is a real one. The page
 * root carries the clock, a seed and the pointer as CSS variables
 * (components/core/profile/page-variables.ts); the pointer only moves on a
 * page that uses it.
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

const PAGE = `<Var name="roll" type="computed" expression="random(1, 1000000)" />
<Var name="hour" type="computed" expression="$time.hour" />
<Var name="pet" type="computed" expression="pick(['cat', 'dog', 'owl'])" />
<Var name="dice" type="number" initial="0" />
<OnMount><Set var="dice" expression="random(1000, 1000000)" /></OnMount>
<p id="roll"><ShowVar name="roll" /></p>
<p id="hour"><ShowVar name="hour" /></p>
<p id="pet"><ShowVar name="pet" /></p>
<p id="dice"><ShowVar name="dice" /></p>`

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

/** Until `ready` (components hydrate in their own time when the machine is busy), for up to 2 s */
async function until(ready: () => boolean) {
  for (let waited = 0; !ready() && waited < 2000; waited += 20) await settle(20)
}

/** Server HTML, then the page hydrated in a browser; `during` runs while it's open */
async function visit(source: string, { css = '', during, ready }: { css?: string; during?: (dom: JSDOM) => Promise<void>; ready?: (text: (id: string) => string) => boolean } = {}) {
  const html = renderToString(page(source))
  const dom = new JSDOM(`<!doctype html><html><head><style id="advanced-template-css">${css}</style></head><body><div id="app">${html}</div></body></html>`, {
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
    const text = (id: string) => dom.window.document.getElementById(`user-content-${id}`)?.textContent ?? ''
    await settle()
    if (ready) await until(() => ready(text))
    await during?.(dom)
    const root = dom.window.document.getElementById(`profile-${OWNER_ID}`)!
    const vars = Object.fromEntries(['--hour', '--minute', '--weekday', '--month', '--seed', '--pointer-x', '--pointer-y'].map((name) => [name, root.style.getPropertyValue(name)]))
    const result = { html, hydrationErrors, roll: text('roll'), hour: text('hour'), pet: text('pet'), dice: text('dice'), vars }
    app.unmount()
    return result
  } finally {
    leave()
    dom.window.close()
  }
}

test('the server and hydration agree, then the page goes live', async () => {
  const visited = await visit(PAGE, { ready: (text) => text('roll') !== '1' && text('dice') !== '0' })
  // The server's render: lowest roll, first pick, no time yet
  const served = (id: string) => new RegExp(`id="user-content-${id}"><ts-island><!--\\$-->([^<]*)<`).exec(visited.html)?.[1]
  expect([served('roll'), served('hour'), served('pet')]).toEqual(['1', '', 'cat'])
  expect(visited.hydrationErrors).toEqual([])
  // Live in the browser
  expect(Number(visited.roll)).toBeGreaterThan(1)
  expect(visited.hour).toBe(String(new Date().getHours()))
  expect(['cat', 'dog', 'owl']).toContain(visited.pet)
  // An OnMount's roll is a real one, not the held-still lowest
  expect(Number(visited.dice)).toBeGreaterThan(1000)
})

test('the root carries the clock and a seed; the pointer stays put on a page that never uses it', async () => {
  const { vars } = await visit('<p>hello</p>', {
    during: async (dom) => {
      dom.window.dispatchEvent(new dom.window.MouseEvent('pointermove', { clientX: 256, clientY: 0 }))
      await settle()
    },
  })
  const now = new Date()
  expect(vars['--hour']).toBe(String(now.getHours()))
  expect(vars['--weekday']).toBe(String(now.getDay()))
  expect(vars['--month']).toBe(String(now.getMonth() + 1))
  expect(Number(vars['--seed'])).toBeGreaterThanOrEqual(0)
  expect(Number(vars['--seed'])).toBeLessThanOrEqual(1)
  expect(vars['--pointer-x']).toBe('0.5')
})

test('a page whose CSS uses the pointer gets it, across the window', async () => {
  const { vars } = await visit('<p class="eye">o</p>', {
    css: '.eye { translate: calc(var(--pointer-x) * 10px) 0; }',
    during: async (dom) => {
      dom.window.dispatchEvent(new dom.window.MouseEvent('pointermove', { clientX: dom.window.innerWidth / 4, clientY: dom.window.innerHeight }))
      await settle()
    },
  })
  expect(vars['--pointer-x']).toBe('0.25')
  expect(vars['--pointer-y']).toBe('1')
})
