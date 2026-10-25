/**
 * @jest-environment node
 *
 * GOLDEN: a page of your own HTML is server-rendered, hydrates without a
 * mismatch, and ends up as the same DOM the old browser-only renderer built
 * (design/profile-editing-audit/engine.md R1).
 *
 * The fixtures in ../ssr-golden/ were captured from the old renderer
 * (DOMParser over staticHTML, then React in the browser) before the switch,
 * for every starter and the pasted-page corpus, as a visitor and as the
 * owner, once its effects had settled.
 *
 * Here each page goes the way a visit does: rendered to HTML with no window
 * (as Next does on the server), parsed into a browser DOM, hydrated there,
 * effects settled, then compared. Two sources per page: the stored compile
 * AST (rows saved today), and the stored staticHTML alone (older rows),
 * which the server parses itself.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

// PixelIcon builds a next/dynamic SVG import inside render; the server sends
// its loading box (what the fixtures show) and the browser fills it in later.
// Under jest the SVG import is a file stub, so render that box directly.
jest.mock('@/components/ui/PixelIcon', () => {
  const React = jest.requireActual('react')
  const PixelIcon = ({ size = 24 }: { size?: number }) =>
    React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } })
  return { PixelIcon, default: PixelIcon }
})

// The component runtime loads at once, as in Next's server render
jest.mock('next/dynamic', () => require('../sync-dynamic').syncDynamic)

import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM, VirtualConsole } from 'jsdom'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { generateStaticHTML } from '@/lib/templates/compilation/compiler/html-optimizer'
import {
  AppProviders,
  corpus,
  residentData,
  serializeDom,
  GOLDEN_DIR,
  OWNER_ID,
  enterBrowser,
} from '../ssr-golden-support'

const VIEWERS = [
  ['visitor', 'u_visitor'],
  ['owner', OWNER_ID],
] as const

/** The compile result as the save API stores it (a JSON column) */
function storedCompileResult(source: string) {
  const a = compileTemplateToArtifacts(source)
  return JSON.parse(JSON.stringify({ mode: 'advanced', staticHTML: a.staticHTML, islands: a.islands, ast: a.ast }))
}

/**
 * Each page's stored compile result is a fixture too, so this test pins the
 * renderer alone: a compiler change can't move it. To re-baseline after a
 * deliberate component or compiler change: UPDATE_SSR_GOLDEN=1 (rewrites the
 * inputs from the corpus and the expected DOM from this renderer; review the
 * diff).
 */
const UPDATE = process.env.UPDATE_SSR_GOLDEN === '1'
function storedInput(id: string, source: string) {
  const file = path.join(GOLDEN_DIR, `${id}.input.json`)
  if (UPDATE) {
    const { ast, islands } = storedCompileResult(source)
    fs.writeFileSync(file, JSON.stringify({ ast, islands }))
  }
  const { ast, islands } = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { mode: 'advanced', staticHTML: generateStaticHTML(ast, islands), islands, ast }
}

function page(compiledTemplate: unknown, viewerId: string | null) {
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate } }
  return (
    <AppProviders>
      <AdvancedProfileRenderer user={user} residentData={residentData(viewerId)} />
    </AppProviders>
  )
}

/** Logged errors, kept per test */
let logged: unknown[][] = []
const realError = console.error
beforeEach(() => {
  logged = []
  console.error = (...args: unknown[]) => {
    logged.push(args)
  }
})
afterEach(() => {
  console.error = realError
})

async function settle(ms = Number(process.env.SETTLE_MS) || 60) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Settle, then keep waiting while the page still says it's loading (the
 * guestbook and posts fetch after hydration). A fixed wait came up short
 * when the machine was busy. No fixture contains "Loading", and pages
 * without it are compared after the same single settle as before.
 */
async function settleLoaded(root: Element, maxMs = 3000) {
  await settle()
  const start = Date.now()
  while (/Loading/.test(root.textContent || '') && Date.now() - start < maxMs) await settle(30)
}

/** Server HTML → browser DOM → hydrate → settled DOM, plus hydration errors */
async function visit(compiledTemplate: unknown, viewerId: string, beforeHydrate?: (dom: JSDOM) => void) {
  logged = []
  const html = renderToString(page(compiledTemplate, viewerId))
  const serverErrors = logged.splice(0)

  const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="root">${html}</div></body></html>`, {
    url: 'http://localhost/resident/pat',
    pretendToBeVisual: true,
    // jsdom's own "not implemented" notices (media playback) aren't the page's
    virtualConsole: new VirtualConsole(),
  })
  const leave = enterBrowser(dom)
  const hydrationErrors: unknown[] = []
  try {
    beforeHydrate?.(dom)
    // Loaded here, with a browser present, as the client bundle would be
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client')
    const root = hydrateRoot(dom.window.document.getElementById('root')!, page(compiledTemplate, viewerId), {
      onRecoverableError: (error) => hydrationErrors.push(error),
    })
    const rootEl = dom.window.document.getElementById('root')!
    await settleLoaded(rootEl)
    // React 19 puts <link rel=preload as=image> hints for the page's images
    // into the server HTML. Resource hints, not page content: not compared.
    rootEl.querySelectorAll('link[rel="preload"][as="image"]').forEach((link) => link.remove())
    const settled = serializeDom(rootEl)
    root.unmount()
    return { html, serverErrors, hydrationErrors, settled }
  } finally {
    leave()
    dom.window.close()
  }
}

describe.each(corpus())('%s', (id, source) => {
  const stored = storedInput(id, source)

  test.each(VIEWERS)('as %s: server-rendered, hydrated, same DOM as before', async (who, viewerId) => {
    const goldenFile = path.join(GOLDEN_DIR, `${id}.${who}.html`)
    // As getServerSideProps builds it, for this viewer
    const viewer = { isOwner: who === 'owner' }
    const sources = {
      ast: pageForRender(stored, viewer),
      staticHTML: pageForRender({ staticHTML: stored.staticHTML, islands: stored.islands }, viewer),
    }
    for (const [from, compiled] of Object.entries(sources)) {
      expect(compiled).not.toBeNull()
      const result = await visit(compiled, viewerId)
      if (UPDATE && from === 'ast') fs.writeFileSync(goldenFile, result.settled)
      const golden = fs.readFileSync(goldenFile, 'utf8')
      expect({ from, serverErrors: result.serverErrors }).toEqual({ from, serverErrors: [] })
      expect({ from, hydrationErrors: result.hydrationErrors.map(String) }).toEqual({ from, hydrationErrors: [] })
      expect({ from, dom: result.settled }).toEqual({ from, dom: golden })
      // Nothing of the site's chrome is inside the page root: the page's CSS
      // is kept off the chrome only by being confined to the root
      // (scopeAdvancedSelector), with no @scope boundary any more
      expect(result.settled).not.toContain('data-site-chrome')
    }
  })
})

describe('the page is in the response', () => {
  test("its HTML is server-rendered, not a loading message", () => {
    const html = renderToString(
      page(pageForRender(storedCompileResult('<main><h1>Hello <b>there</b></h1><p>From my page</p></main>')), null)
    )
    expect(html).toContain('<main><h1>Hello <b>there</b></h1><p>From my page</p></main>')
    expect(html).not.toMatch(/Loading advanced template/)
  })
})

describe("a page's <Var>s on the server", () => {
  const nightWindow = () => {
    const [, source] = corpus().find(([id]) => id === 'example-nightWindow')!
    return pageForRender(storedInput('example-nightWindow', source))
  }

  test('render with their declared starting values, not unset', () => {
    const html = renderToString(page(nightWindow(), 'u_visitor'))
    expect(html).toContain('the lamp is on')
    expect(html).not.toContain('lights out')
    expect(html).toMatch(/you(&#x27;|')ve left <ts-island>0<\/ts-island> on this sill/)
  })

  test('never land in the module-wide store (it would carry them into the next request)', () => {
    const { globalTemplateStateManager } = require('@/lib/templates/state/TemplateStateManager')
    renderToString(page(nightWindow(), 'u_visitor'))
    expect(globalTemplateStateManager.getAllVariables()).toEqual({})
  })

  test("a visitor's saved value still loads after the page hydrates, without a mismatch", async () => {
    const result = await visit(nightWindow(), 'u_visitor', (dom) => {
      // Kept per page: the page's owner, then the name
      dom.window.localStorage.setItem(`threadstead_template_${OWNER_ID}_lampOn`, 'false')
      dom.window.localStorage.setItem(`threadstead_template_${OWNER_ID}_kudos`, '7')
    })
    expect(result.html).toContain('the lamp is on')
    expect(result.hydrationErrors.map(String)).toEqual([])
    expect(result.settled).toContain('lights out')
    expect(result.settled).not.toContain('the lamp is on')
    expect(result.settled).toMatch(/left\s*"?\s*<ts-island>\s*"?7/)
  })
})

describe('IfOwner / IfVisitor', () => {
  const source = `<main>
    <h1>My page</h1>
    <IfOwner><p>owner-only note <ShowVar name="secretVar" /></p><Var name="secretVar" type="string" initial="owner-secret-initial" /></IfOwner>
    <IfVisitor><p>visitor-only welcome</p></IfVisitor>
  </main>`

  test("the other side's content isn't in the page data sent to the browser", () => {
    const stored = storedCompileResult(source)
    const forVisitor = JSON.stringify(pageForRender(stored, { isOwner: false }))
    const forOwner = JSON.stringify(pageForRender(stored, { isOwner: true }))
    expect(forVisitor).toContain('visitor-only welcome')
    expect(forVisitor).not.toContain('owner-only note')
    expect(forVisitor).not.toContain('owner-secret-initial')
    expect(forOwner).toContain('owner-only note')
    expect(forOwner).toContain('owner-secret-initial')
    expect(forOwner).not.toContain('visitor-only welcome')
    // Without a viewer, a visitor's
    expect(JSON.stringify(pageForRender(stored))).toEqual(forVisitor)
  })

  test.each(VIEWERS)('as %s: hydrates without a mismatch and shows the right side', async (who, viewerId) => {
    const compiled = pageForRender(storedCompileResult(source), { isOwner: who === 'owner' })
    const result = await visit(compiled, viewerId)
    expect(result.serverErrors).toEqual([])
    expect(result.hydrationErrors.map(String)).toEqual([])
    if (who === 'owner') {
      expect(result.html).toContain('owner-only note')
      expect(result.settled).toContain('owner-secret-initial')
      expect(result.settled).not.toContain('visitor-only welcome')
    } else {
      expect(result.html).toContain('visitor-only welcome')
      expect(result.settled).not.toContain('owner-only note')
    }
  })
})

describe('a component that throws on the server', () => {
  test("doesn't take the page down: the page is left to the browser", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { componentRegistry } = require('@/lib/templates/core/template-registry')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { renderToReadableStream } = require('react-dom/server.edge')
    const Thrower = () => {
      if (typeof window === 'undefined') throw new Error('needs a browser')
      return <b>fine</b>
    }
    const realGet = componentRegistry.get.bind(componentRegistry)
    const spy = jest
      .spyOn(componentRegistry, 'get')
      .mockImplementation((name: unknown) => (name === 'thrower' ? { component: Thrower } : realGet(name)))
    try {
      const compiled = {
        tree: [{ t: 'main', c: [{ t: 'h1', c: ['My page'] }, { t: 'span', a: [['data-island', 'island-thrower-abc123'], ['data-component', 'thrower']] }] }],
        islands: [{ id: 'island-thrower-abc123', component: 'thrower', props: {} }],
      }
      const stream = await renderToReadableStream(page(compiled, null), { onError: () => {} })
      await stream.allReady
      const html = await new Response(stream).text()
      // The page's own wrapper still comes from the server; its content waits for the browser
      expect(html).toContain('class="profile-template-root"')
      expect(html).not.toContain('fine')
    } finally {
      spy.mockRestore()
    }
  })
})
