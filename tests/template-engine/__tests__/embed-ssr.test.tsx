/**
 * @jest-environment node
 *
 * <Embed> on a page of your own HTML, the way a visit goes: compiled,
 * server-rendered with no window, hydrated in a browser DOM, then clicked.
 *
 * Owner's rule (2026-10-19): nothing reaches the other site before the
 * visitor clicks. So the server HTML and the hydrated page hold a plain
 * placeholder (no iframe, no thumbnail, not even the host's address), and
 * only the click swaps in the player, at the address embedFor rebuilt.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

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
import { JSDOM, VirtualConsole } from 'jsdom'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { embedFor, EMBED_HOSTS } from '@/lib/templates/embeds'
import { AppProviders, residentData, OWNER_ID, enterBrowser } from '../ssr-golden-support'

const VISITOR = 'u_visitor'

const warningsFor = (source: string) => compileTemplateToArtifacts(source).warnings

function compiledFor(source: string, viewerId: string) {
  const a = compileTemplateToArtifacts(source)
  // As the save API stores it (a JSON column), then as getServerSideProps sends it
  const stored = JSON.parse(JSON.stringify({ mode: 'advanced', staticHTML: a.staticHTML, islands: a.islands, ast: a.ast }))
  return pageForRender(stored, { isOwner: viewerId === OWNER_ID })
}

function page(compiledTemplate: unknown, viewerId: string) {
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate } }
  return (
    <AppProviders>
      <AdvancedProfileRenderer user={user} residentData={residentData(viewerId)} />
    </AppProviders>
  )
}

const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))

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

/**
 * Server HTML, then a browser that hydrates it; `inBrowser` runs with the
 * hydrated page (and may click). Returns the server HTML and what React
 * complained about while hydrating.
 */
async function visit(source: string, viewerId: string, inBrowser: (doc: Document, win: JSDOM['window']) => Promise<void>) {
  const compiled = compiledFor(source, viewerId)
  const html = renderToString(page(compiled, viewerId))
  const serverErrors = logged.splice(0)

  const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="root">${html}</div></body></html>`, {
    url: 'http://localhost/resident/pat',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  })
  const leave = enterBrowser(dom)
  const hydrationErrors: unknown[] = []
  try {
    const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client')
    const root = hydrateRoot(dom.window.document.getElementById('root')!, page(compiled, viewerId), {
      onRecoverableError: (error) => hydrationErrors.push(error),
    })
    await settle()
    await inBrowser(dom.window.document, dom.window)
    root.unmount()
  } finally {
    leave()
    dom.window.close()
  }
  return { html, serverErrors, hydrationErrors: hydrationErrors.map(String), consoleErrors: logged.map(String) }
}

function playButton(doc: Document): HTMLButtonElement | undefined {
  return Array.from(doc.querySelectorAll('button')).find((b) => /^Play from /.test(b.textContent ?? ''))
}

const LINKS = [
  ['YouTube', 'https://www.youtube.com/watch?v=jNQXAC9IVRw'],
  ['Vimeo', 'https://vimeo.com/76979871'],
  ['Bandcamp', 'https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/tracklist=false/artwork=small/'],
  ['SoundCloud', 'https://soundcloud.com/some-artist/a-song'],
  ['Spotify', 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'],
] as const

describe.each(LINKS)('%s', (label, link) => {
  const source = `<main><h1>Listening</h1><Embed src="${link}" title="A favourite" /></main>`
  const player = embedFor(link)!
  const info = EMBED_HOSTS[player.host]
  const hostName = new URL(info.origin).hostname

  test('nothing from the other site until the click, then its player', async () => {
    expect(warningsFor(source)).toEqual([])
    let before = ''
    let after: HTMLIFrameElement | null = null
    const result = await visit(source, VISITOR, async (doc, win) => {
      before = doc.getElementById('root')!.innerHTML
      const button = playButton(doc)
      expect(button?.textContent).toBe(`Play from ${label}`)
      button!.dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
      await settle()
      after = doc.querySelector('iframe')
    })

    // Server HTML: the placeholder, with no iframe and no address of the host's
    expect(result.serverErrors).toEqual([])
    expect(result.html).toContain(`Play from ${label}`)
    expect(result.html).toContain('A favourite')
    expect(result.html).not.toMatch(/<iframe/i)
    expect(result.html).not.toContain(hostName)
    expect(result.html).not.toMatch(/youtube(-nocookie)?\.com|youtu\.be|vimeo\.com|bandcamp\.com|soundcloud\.com|spotify\.com|https?:/)
    expect(result.html).not.toMatch(/rel="(preconnect|dns-prefetch|preload)"/)

    // Hydrated, still before the click: the same, and no mismatch
    expect(result.hydrationErrors).toEqual([])
    expect(result.consoleErrors).toEqual([])
    expect(before).not.toMatch(/<iframe/i)
    expect(before).not.toContain(hostName)

    // After the click: the player, at the rebuilt address, fenced in
    expect(after).not.toBeNull()
    const frame = after! as HTMLIFrameElement
    expect(frame.getAttribute('src')).toBe(player.playUrl)
    expect(new URL(frame.getAttribute('src')!).origin).toBe(info.origin)
    expect(frame.getAttribute('title')).toBe('A favourite')
    expect(frame.getAttribute('loading')).toBe('lazy')
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
    expect(frame.getAttribute('sandbox')).toBe(info.sandbox)
    expect(frame.getAttribute('sandbox')).not.toMatch(/top-navigation|allow-forms|allow-modals/)
    expect(frame.getAttribute('allow')).toBe(info.allow ?? null)
  })
})

describe('a link it can’t play', () => {
  const source = '<main><h1>Listening</h1><Embed src="https://evil.example/watch?v=jNQXAC9IVRw" /></main>'

  test('the editor warns the owner, with the line', () => {
    expect(warningsFor(source)).toEqual([
      "Line 1: <Embed src=\"https://evil.example/watch?v=jNQXAC9IVRw\"> Embed can't play that link. It takes links from YouTube, Vimeo, Bandcamp, SoundCloud and Spotify. Visitors see nothing there.",
    ])
  })

  test('the owner gets a note saying why, without a mismatch', async () => {
    let text = ''
    const result = await visit(source, OWNER_ID.toString(), async (doc) => {
      text = doc.getElementById('root')!.textContent ?? ''
      expect(doc.querySelector('iframe')).toBeNull()
      expect(playButton(doc)).toBeUndefined()
    })
    expect(result.hydrationErrors).toEqual([])
    expect(result.html).toContain('Only you see this note.')
    expect(text).toContain('It takes links from YouTube, Vimeo, Bandcamp, SoundCloud and Spotify.')
  })

  test('visitors see nothing', async () => {
    const result = await visit(source, VISITOR, async (doc) => {
      expect(doc.querySelector('iframe')).toBeNull()
      expect(playButton(doc)).toBeUndefined()
      expect(doc.getElementById('root')!.textContent).not.toMatch(/note|Embed/)
    })
    expect(result.hydrationErrors).toEqual([])
    expect(result.html).not.toContain('Only you see this note.')
    expect(result.html).not.toContain('evil.example')
  })
})

test('a height setting sizes the placeholder and the player alike', async () => {
  const source = '<Embed src="https://open.spotify.com/album/4cOdK2wGLETKBW3PvgPWqT" height="200" />'
  let frameHeight = ''
  const result = await visit(source, VISITOR, async (doc, win) => {
    playButton(doc)!.dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
    await settle()
    frameHeight = (doc.querySelector('iframe') as HTMLIFrameElement).style.height
  })
  expect(result.html).toMatch(/min-height:200px/)
  expect(frameHeight).toBe('200px')
})
