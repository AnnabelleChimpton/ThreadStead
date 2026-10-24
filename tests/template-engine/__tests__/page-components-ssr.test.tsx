/**
 * @jest-environment node
 *
 * <MyRings />, <RingNav />, <MyHouse /> and <HouseBadge /> on a page of your
 * own HTML, the way a visit goes: compiled, server-rendered with no window,
 * hydrated in a browser DOM, then given a moment for anything loaded after.
 *
 * The house components render whole on the server from residentData.pixelHome
 * (lib/templates/page-home.ts). The ring components render nothing on the
 * server and fill in from GET /api/users/<handle>/badges, the read the
 * profile's Badges tab already makes (lib/templates/owner-rings.ts); here
 * that's a fake fetch, and nothing else may be fetched.
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

import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM, VirtualConsole } from 'jsdom'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { forgetOwnerRings } from '@/lib/templates/owner-rings'
import { pageUsesAny, PAGE_HOME_COMPONENTS, type PageHome } from '@/lib/templates/page-home'
import { AppProviders, residentData, OWNER_ID, enterBrowser } from '../ssr-golden-support'

const VISITOR = 'u_visitor'

const HOME: PageHome = {
  template: 'cottage_v1',
  palette: 'thread_sage',
  customizations: { wallColor: '#aabbcc' },
  number: 7,
  snapshotCardUrl: 'https://cdn.example/home-snapshots/u_owner.abc.card.png',
}

const RINGS = {
  badges: [
    { id: 'tiny-gardens', threadRing: { id: 'tiny-gardens', slug: 'tiny-gardens', name: 'Tiny Gardens', visibility: 'public' } },
    { id: 'night-owls', threadRing: { id: 'night-owls', slug: 'night-owls', name: 'Night Owls', visibility: 'unlisted' } },
    { id: 'secret-club', threadRing: { id: 'secret-club', slug: 'secret-club', name: 'Secret Club', visibility: 'private' } },
  ],
}

type Answer = { status: number; body: unknown }

function compiledFor(source: string, viewerId: string) {
  const a = compileTemplateToArtifacts(source)
  expect(a.warnings).toEqual([])
  const stored = JSON.parse(JSON.stringify({ mode: 'advanced', staticHTML: a.staticHTML, islands: a.islands, ast: a.ast }))
  return pageForRender(stored, { isOwner: viewerId === OWNER_ID })
}

function dataFor(viewerId: string, pixelHome: PageHome | null | undefined): ResidentData {
  const data = residentData(viewerId)
  return pixelHome === undefined ? data : { ...data, pixelHome }
}

function page(compiledTemplate: unknown, data: ResidentData) {
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate } }
  return (
    <AppProviders>
      <AdvancedProfileRenderer user={user} residentData={data} />
    </AppProviders>
  )
}

const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))

let logged: unknown[][] = []
const realError = console.error
beforeEach(() => {
  logged = []
  forgetOwnerRings()
  console.error = (...args: unknown[]) => {
    logged.push(args)
  }
})
afterEach(() => {
  console.error = realError
})

/** Server HTML, then a hydrated browser page after things have loaded. */
async function visit(
  source: string,
  viewerId: string,
  { pixelHome, badges = { status: 200, body: RINGS } }: { pixelHome?: PageHome | null; badges?: Answer } = {}
) {
  const data = dataFor(viewerId, pixelHome)
  const compiled = compiledFor(source, viewerId)
  const html = renderToString(page(compiled, data))
  const serverErrors = logged.splice(0)

  const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="root">${html}</div></body></html>`, {
    url: 'http://localhost/resident/pat',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  })
  const leave = enterBrowser(dom)
  const fetched: string[] = []
  ;(globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
    // The site's own providers ask for these on every page
    if (!['/api/signup-audio', '/api/auth/me'].includes(String(url))) fetched.push(String(url))
    return { ok: badges.status < 400, status: badges.status, json: async () => badges.body }
  }
  const hydrationErrors: unknown[] = []
  let root: HTMLElement
  let text = ''
  let after = ''
  try {
    const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client')
    root = dom.window.document.getElementById('root')!
    const app = hydrateRoot(root, page(compiled, data), {
      onRecoverableError: (error) => hydrationErrors.push(error),
    })
    await settle()
    after = root.innerHTML
    text = root.textContent ?? ''
    app.unmount()
  } finally {
    leave()
    dom.window.close()
  }
  return {
    html,
    after,
    text,
    fetched,
    serverErrors,
    hydrationErrors: hydrationErrors.map(String),
    consoleErrors: logged.map(String),
  }
}

function clean(result: Awaited<ReturnType<typeof visit>>) {
  expect(result.serverErrors).toEqual([])
  expect(result.hydrationErrors).toEqual([])
  expect(result.consoleErrors).toEqual([])
}

const links = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))

describe('<MyRings />', () => {
  const source = '<section><h2>My rings</h2><MyRings /></section>'

  test.each([VISITOR, OWNER_ID])('lists public and unlisted rings after load, for %s', async (viewer) => {
    const result = await visit(source, viewer)
    clean(result)
    // Nothing from the hub in the server's HTML
    expect(result.html).not.toContain('Tiny Gardens')
    expect(result.fetched).toEqual(['/api/users/pat/badges'])
    expect(result.text).toContain('Tiny Gardens')
    expect(result.text).toContain('Night Owls')
    expect(result.text).not.toContain('Secret Club')
    expect(links(result.after)).toEqual(['/tr/tiny-gardens', '/tr/night-owls'])
  })

  test('limit', async () => {
    const result = await visit('<MyRings limit="1" />', VISITOR)
    clean(result)
    expect(links(result.after)).toEqual(['/tr/tiny-gardens'])
  })

  test('no rings: the owner gets a note, visitors nothing', async () => {
    const none = { status: 200, body: { badges: [] } }
    const owner = await visit(source, OWNER_ID, { badges: none })
    clean(owner)
    expect(owner.text).toContain("You're not in any rings yet. Find one. Only you see this note.")
    expect(links(owner.after)).toEqual(['/threadrings'])

    const visitor = await visit(source, VISITOR, { badges: none })
    clean(visitor)
    expect(visitor.text).toBe('My rings')
  })

  test('hub down: nothing, not "no rings"', async () => {
    const result = await visit(source, OWNER_ID, { badges: { status: 503, body: { error: 'hub_unavailable' } } })
    clean(result)
    expect(result.text).toBe('My rings')
  })
})

describe('<RingNav />', () => {
  test('a public ring you are in: webring links through the ring walk', async () => {
    const result = await visit('<RingNav ring="tiny-gardens" />', VISITOR, { pixelHome: HOME })
    clean(result)
    expect(result.html).not.toContain('tiny-gardens')
    expect(result.text.replace(/\s+/g, ' ').trim()).toBe('Previous Tiny Gardens Random Next')
    expect(links(result.after)).toEqual([
      '/neighborhood/walk?ring=tiny-gardens&from=6&go=prev',
      '/tr/tiny-gardens',
      '/neighborhood/walk?ring=tiny-gardens&from=7&go=random',
      '/neighborhood/walk?ring=tiny-gardens&from=7&go=next',
    ])
    expect(result.after).toContain('aria-label="Tiny Gardens webring"')
    // Links only: the one read is the owner's ring list
    expect(result.fetched).toEqual(['/api/users/pat/badges'])
  })

  test('no home of your own: the walk starts from the top of the street', async () => {
    const result = await visit('<RingNav ring="Tiny-Gardens" />', VISITOR, { pixelHome: null })
    clean(result)
    expect(links(result.after)).toEqual([
      '/neighborhood/walk?ring=tiny-gardens&from=0&go=prev',
      '/tr/tiny-gardens',
      '/neighborhood/walk?ring=tiny-gardens&from=0&go=random',
      '/neighborhood/walk?ring=tiny-gardens&from=0&go=next',
    ])
  })

  test.each(['knitting', 'night-owls', 'secret-club'])('not in a public ring %s: visitors see nothing, the owner a note', async (slug) => {
    const visitor = await visit(`<p>Rings:</p><RingNav ring="${slug}" />`, VISITOR, { pixelHome: HOME })
    clean(visitor)
    expect(visitor.text).toBe('Rings:')
    expect(links(visitor.after)).toEqual([])

    const owner = await visit(`<p>Rings:</p><RingNav ring="${slug}" />`, OWNER_ID, { pixelHome: HOME })
    clean(owner)
    expect(owner.text).toBe(`Rings:You're not in a public ring called "${slug}", so visitors see nothing here. Only you see this note.`)
  })

  test('two on a page share one read', async () => {
    const result = await visit('<RingNav ring="tiny-gardens" /><RingNav ring="tiny-gardens" /><MyRings />', VISITOR, { pixelHome: HOME })
    clean(result)
    expect(result.fetched).toEqual(['/api/users/pat/badges'])
    expect(result.after.match(/webring/g)).toHaveLength(2)
  })
})

describe('<MyHouse />', () => {
  test.each([VISITOR, OWNER_ID])('the yard picture, linking home, in the server HTML, for %s', async (viewer) => {
    const result = await visit('<MyHouse size="sm" />', viewer, { pixelHome: HOME })
    clean(result)
    expect(result.html).toContain('href="/home/pat"')
    expect(result.html).toContain(`src="${HOME.snapshotCardUrl}"`)
    expect(result.html).toContain('width="128"')
    expect(result.html).toContain('height="88"')
    expect(result.html).toContain('alt="Pat Example&#x27;s pixel home"')
    expect(result.fetched).toEqual([])
  })

  test('no picture yet: the house itself', async () => {
    const result = await visit('<MyHouse />', VISITOR, { pixelHome: { ...HOME, snapshotCardUrl: null } })
    clean(result)
    expect(result.html).toContain('href="/home/pat"')
    expect(result.html).toMatch(/<svg[^>]*viewBox="0 0 200 180"/)
    expect(result.html).toContain('#aabbcc')
    expect(result.html).not.toContain('<img')
  })

  test.each([VISITOR, OWNER_ID])('no home: nothing, for %s', async (viewer) => {
    const result = await visit('<p>Home:</p><MyHouse />', viewer, { pixelHome: null })
    clean(result)
    expect(result.text).toBe('Home:')
    expect(result.html).not.toContain('/home/pat')
  })

  test('not loaded (the editor preview): a note for the owner only', async () => {
    const owner = await visit('<MyHouse />', OWNER_ID)
    clean(owner)
    expect(owner.html).toContain('Your pixel home shows here on your page.')
    const visitor = await visit('<p>Home:</p><MyHouse />', VISITOR)
    clean(visitor)
    expect(visitor.text).toBe('Home:')
  })
})

describe('<HouseBadge />', () => {
  test.each([VISITOR, OWNER_ID])('the 88×31 badge linking home, in the server HTML, for %s', async (viewer) => {
    const result = await visit('<HouseBadge />', viewer, { pixelHome: HOME })
    clean(result)
    expect(result.html).toContain('href="/home/pat"')
    expect(result.html).toContain('src="/api/home/pat/badge"')
    expect(result.html).toContain('width="88"')
    expect(result.html).toContain('height="31"')
    expect(result.fetched).toEqual([])
  })

  test.each([VISITOR, OWNER_ID])('no home: nothing, for %s', async (viewer) => {
    const result = await visit('<p>Badge:</p><HouseBadge />', viewer, { pixelHome: null })
    clean(result)
    expect(result.text).toBe('Badge:')
    expect(result.html).not.toContain('/api/home/')
  })
})

test('the profile page reads the home only for a page that uses one of them', () => {
  const stored = (source: string) => JSON.parse(JSON.stringify(compileTemplateToArtifacts(source)))
  expect(pageUsesAny(stored('<main><MyHouse /></main>'), PAGE_HOME_COMPONENTS)).toBe(true)
  expect(pageUsesAny(stored('<IfOwner><HouseBadge /></IfOwner>'), PAGE_HOME_COMPONENTS)).toBe(true)
  expect(pageUsesAny(stored('<RingNav ring="tiny-gardens" />'), PAGE_HOME_COMPONENTS)).toBe(true)
  expect(pageUsesAny(stored('<MyRings /><Guestbook />'), PAGE_HOME_COMPONENTS)).toBe(false)
})

describe('plain HTML renders and hydrates as written (audit cross-check C)', () => {
  test('a table laid out on lines, a chosen option and a find-in-page section hydrate cleanly', async () => {
    const result = await visit(`<table>
  <tr>
    <td>a</td>
  </tr>
</table>
<select><option>one</option><option selected>two</option></select>
<div hidden="until-found">found it</div>
<pre>
first line</pre>`, VISITOR)
    clean(result)
    expect(result.html).toMatch(/<option selected="">two<\/option>/)
    expect(result.after).toContain('hidden="until-found"')
    expect(result.text).toContain('first line')
  })

  test('the page root has its id once', async () => {
    const result = await visit('<p>hi</p>', VISITOR)
    expect(result.html.match(/id="profile-/g)).toHaveLength(1)
  })
})
