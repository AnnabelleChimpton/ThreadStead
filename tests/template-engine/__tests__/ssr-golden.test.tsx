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

// ---- a browser to hydrate in --------------------------------------------

const BROWSER_GLOBALS = [
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'Node', 'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement',
  'HTMLIFrameElement', 'Text', 'Comment', 'DocumentFragment', 'SVGElement',
  'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'InputEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'DOMParser', 'MutationObserver',
  'Audio', 'Image', 'HTMLMediaElement', 'HTMLAudioElement', 'HTMLImageElement', 'Blob', 'URL', 'FormData',
] as const

/** Make `dom` the global browser (as on a real visit) until the returned undo runs */
function enterBrowser(dom: JSDOM): () => void {
  const g = globalThis as unknown as Record<string, unknown>
  const saved = new Map<string, PropertyDescriptor | undefined>()
  const set = (name: string, value: unknown) => {
    saved.set(name, Object.getOwnPropertyDescriptor(g, name))
    Object.defineProperty(g, name, { value, configurable: true, writable: true })
  }
  const w = dom.window as unknown as Record<string, unknown>
  for (const name of BROWSER_GLOBALS) set(name, name === 'window' ? dom.window : w[name])
  set('self', dom.window)
  const noopObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  set('IntersectionObserver', noopObserver)
  set('ResizeObserver', noopObserver)
  set('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }))
  ;(dom.window as unknown as Record<string, unknown>).matchMedia = g.matchMedia
  ;(dom.window as unknown as Record<string, unknown>).IntersectionObserver = noopObserver
  set('fetch', async () => ({ ok: true, status: 200, json: async () => ({}) }))
  return () => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(g, name, descriptor)
      else delete g[name]
    }
  }
}

async function settle(ms = Number(process.env.SETTLE_MS) || 60) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** Server HTML → browser DOM → hydrate → settled DOM, plus hydration errors */
async function visit(compiledTemplate: unknown, viewerId: string) {
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
    // Loaded here, with a browser present, as the client bundle would be
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client')
    const root = hydrateRoot(dom.window.document.getElementById('root')!, page(compiledTemplate, viewerId), {
      onRecoverableError: (error) => hydrationErrors.push(error),
    })
    await settle()
    const rootEl = dom.window.document.getElementById('root')!
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
  const sources = {
    ast: pageForRender(stored),
    staticHTML: pageForRender({ staticHTML: stored.staticHTML, islands: stored.islands }),
  }

  test.each(VIEWERS)('as %s: server-rendered, hydrated, same DOM as before', async (who, viewerId) => {
    const goldenFile = path.join(GOLDEN_DIR, `${id}.${who}.html`)
    for (const [from, compiled] of Object.entries(sources)) {
      expect(compiled).not.toBeNull()
      const result = await visit(compiled, viewerId)
      if (UPDATE && from === 'ast') fs.writeFileSync(goldenFile, result.settled)
      const golden = fs.readFileSync(goldenFile, 'utf8')
      expect({ from, serverErrors: result.serverErrors }).toEqual({ from, serverErrors: [] })
      expect({ from, hydrationErrors: result.hydrationErrors.map(String) }).toEqual({ from, hydrationErrors: [] })
      expect({ from, dom: result.settled }).toEqual({ from, dom: golden })
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
