/**
 * @jest-environment node
 *
 * <CustomHTMLElement content="…"> (and innerHTML="…") carries HTML inside
 * an attribute value, where the page sanitizer never looks. It's cleaned on
 * the server, with the page's own sanitizer (lib/templates/compilation/custom-html.ts):
 * when the page is built, and when a stored page is rendered, so rows saved
 * before that check are covered too. A text child is text. These render the
 * way a visit does (server HTML, parsed into a browser DOM) and check that
 * event handlers and scripts don't reach the DOM. Payloads are inert on purpose.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

// The component runtime loads at once, as in Next's server render
jest.mock('next/dynamic', () => require('../sync-dynamic').syncDynamic)

import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import CustomHTMLElement, { CUSTOM_HTML_TAGS } from '@/components/features/templates/CustomHTMLElement'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'
import { sanitizeCustomHTML, cleanCustomHtmlIslands } from '@/lib/templates/compilation/custom-html'
import { loadResidentPage } from '@/lib/domain/profile/load-resident-page'
import { db } from '@/lib/config/database/connection'
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { AppProviders, OWNER_ID, residentData } from '../ssr-golden-support'

const UNSAFE = '<p>stays</p><img src="/a.png" onerror="x"><b onclick="x">bold</b><script>kept-out</script>'
const ESCAPED = UNSAFE.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The server HTML as a browser builds it */
function domOf(html: string) {
  return new JSDOM(`<!doctype html><body>${html}</body>`).window.document
}

function expectNothingRuns(doc: Document) {
  expect(doc.querySelector('script')).toBeNull()
  const handlers = Array.from(doc.querySelectorAll('*')).flatMap((el) =>
    el.getAttributeNames().filter((name) => name.toLowerCase().startsWith('on'))
  )
  expect(handlers).toEqual([])
  expect(doc.body.textContent).not.toContain('kept-out')
}

/**
 * The page as a visit gets it: stored as a save stores it (the build's
 * artifact) or, for a row from before, as the old compile result, then read
 * by the loader getServerSideProps uses.
 */
async function renderPage(source: string, stored: 'artifact' | 'old copy' = 'artifact') {
  let row: Record<string, unknown>
  if (stored === 'artifact') {
    const built = await compileForEditor(source)
    if (!built.ok) throw new Error(built.body.errors[0])
    row = { pageArtifact: JSON.stringify(built.artifact), compiledTemplate: null }
  } else {
    const a = compileTemplateToArtifacts(source)
    row = { pageArtifact: null, compiledTemplate: JSON.parse(JSON.stringify({ staticHTML: a.staticHTML, islands: a.islands, ast: a.ast })) }
  }
  ;(db.handle.findFirst as jest.Mock).mockResolvedValue({
    user: { id: OWNER_ID, did: 'did:x', primaryHandle: 'pat@local', subdomainLabel: 'pat', installs: [], profile: { templateMode: 'advanced', visibility: 'public', customTemplate: source, widgetSlot: null, profileMidiId: null, ...row } },
  })
  const lookup = await loadResidentPage('pat', null)
  if (lookup.status !== 'ok') throw new Error(lookup.status)
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate: lookup.resident.page } }
  return renderToString(
    <AppProviders>
      <AdvancedProfileRenderer user={user} residentData={residentData('u_visitor')} />
    </AppProviders>
  )
}

const realError = console.error
beforeEach(() => {
  console.error = () => {}
})
afterEach(() => {
  console.error = realError
})

describe('CustomHTMLElement and the HTML in its props', () => {
  test.each([
    ['content', { content: UNSAFE }],
    ['innerHTML', { innerHTML: UNSAFE }],
  ])('%s, cleaned on the server: handlers and scripts are dropped, the rest stays', (_label, props) => {
    const [island] = cleanCustomHtmlIslands([{ id: 'i1', component: 'CustomHTMLElement', props } as never])
    const doc = domOf(renderToString(<CustomHTMLElement {...island.props} />))
    expectNothingRuns(doc)
    expect(doc.querySelector('p')?.textContent).toBe('stays')
    expect(doc.querySelector('b')?.textContent).toBe('bold')
    expect(doc.querySelector('img')?.getAttribute('src')).toBe('/a.png')
  })

  test('a text child is text', () => {
    const doc = domOf(renderToString(<CustomHTMLElement>{UNSAFE}</CustomHTMLElement>))
    // Shown as written, so nothing in it is an element at all
    expect(doc.querySelector('script, img, b, p')).toBeNull()
    expect(doc.body.textContent).toContain(UNSAFE)
  })

  test('script links are dropped', () => {
    const scheme = ['java', 'script'].join('') + ':'
    const html = sanitizeCustomHTML(`<a href="${scheme}x">a</a><a href="/ok">b</a>`)
    expect(html).not.toContain(scheme)
    expect(html).toContain('href="/ok"')
  })

  test('tagName outside its list renders as a div', () => {
    const wrapperOf = (tagName: string) => {
      const doc = domOf(renderToString(<CustomHTMLElement tagName={tagName} content="<p>hi</p>" />))
      const wrapper = doc.querySelector('.custom-html-auto-reset')
      expect(wrapper?.querySelector('p')?.textContent).toBe('hi')
      return wrapper?.tagName.toLowerCase()
    }
    for (const tagName of ['script', 'iframe', 'style', 'object', 'SCRIPT']) {
      expect(wrapperOf(tagName)).toBe('div')
    }
    expect(wrapperOf('aside')).toBe('aside')
  })

  test('the registry offers the same tags the component allows', () => {
    const registration = componentRegistry.get('CustomHTMLElement')
    expect(registration?.component).toBe(CustomHTMLElement)
    expect(registration?.props?.tagName?.values).toEqual([...CUSTOM_HTML_TAGS])
  })

  test('components inside the string unwrap to their content', () => {
    const html = sanitizeCustomHTML('<p>a</p><CenteredBox><b>b</b></CenteredBox>')
    expect(html).toBe('<p>a</p><b>b</b>')
  })

  test('plain text and empty content stay as they were', () => {
    expect(sanitizeCustomHTML('Now playing: Cocteau Twins')).toBe('Now playing: Cocteau Twins')
    expect(sanitizeCustomHTML('   ')).toBe('')
    expect(renderToString(<CustomHTMLElement />)).not.toMatch(/<div/)
  })
})

jest.mock('@/lib/config/database/connection', () => ({ db: { handle: { findFirst: jest.fn() }, media: { findUnique: jest.fn() } } }))
jest.mock('@/lib/domain/users/profile-access', () => ({ residentAccess: async () => ({ visible: true }), hasPixelHome: async () => false }))
jest.mock('@/lib/domain/bluesky/handle-links', () => ({ verifiedBlueskyHandle: async () => null }))

describe('CustomHTMLElement on a page, server-rendered', () => {
  test.each([
    ['content, entity-escaped', `<CustomHTMLElement content="${ESCAPED}" />`],
    ['innerHTML, entity-escaped', `<CustomHTMLElement innerHTML="${ESCAPED}" />`],
    ['content, raw in single quotes', `<CustomHTMLElement content='${UNSAFE}' />`],
    ['an escaped text child', `<CustomHTMLElement>${ESCAPED}</CustomHTMLElement>`],
    ['tagName set to script', '<CustomHTMLElement tagName="script" content="shown as text" />'],
  ])('%s', async (_label, source) => {
    for (const stored of ['artifact', 'old copy'] as const) {
      const doc = domOf(await renderPage(`<div><h1>My page</h1>${source}</div>`, stored))
      expectNothingRuns(doc)
      expect(doc.body.textContent).toContain('My page')
    }
  })

  test('a harmless value still shows', async () => {
    const doc = domOf(await renderPage('<CustomHTMLElement tagName="aside" content="Now playing: Cocteau Twins" />'))
    expect(doc.querySelector('aside')?.textContent).toBe('Now playing: Cocteau Twins')
  })
})
