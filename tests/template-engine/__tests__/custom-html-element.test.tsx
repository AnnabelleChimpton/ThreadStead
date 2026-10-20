/**
 * @jest-environment node
 *
 * <CustomHTMLElement content="…"> (and innerHTML="…", and a text child)
 * carries HTML inside an attribute value, where the page sanitizer never
 * looks. The component cleans it at render with the page's own sanitizer,
 * so rows saved before that check are covered too. These render the way a
 * visit does (server HTML, parsed into a browser DOM) and check that event
 * handlers and scripts don't reach the DOM. Payloads are inert on purpose.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import CustomHTMLElement, { CUSTOM_HTML_TAGS, sanitizeCustomHTML } from '@/components/features/templates/CustomHTMLElement'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
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

function renderPage(source: string) {
  const a = compileTemplateToArtifacts(source)
  // As the save API stores it, then as getServerSideProps hands it over
  const compiledTemplate = pageForRender(
    JSON.parse(JSON.stringify({ mode: 'advanced', staticHTML: a.staticHTML, islands: a.islands, ast: a.ast }))
  )
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, compiledTemplate } }
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

describe('CustomHTMLElement on its own (rows already saved)', () => {
  test.each([
    ['content', { content: UNSAFE }],
    ['innerHTML', { innerHTML: UNSAFE }],
    ['a text child', { children: UNSAFE }],
  ])('%s: handlers and scripts are dropped, the rest stays', (_label, props) => {
    const doc = domOf(renderToString(<CustomHTMLElement {...props} />))
    expectNothingRuns(doc)
    expect(doc.querySelector('p')?.textContent).toBe('stays')
    expect(doc.querySelector('b')?.textContent).toBe('bold')
    expect(doc.querySelector('img')?.getAttribute('src')).toBe('/a.png')
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

describe('CustomHTMLElement on a page, server-rendered', () => {
  test.each([
    ['content, entity-escaped', `<CustomHTMLElement content="${ESCAPED}" />`],
    ['innerHTML, entity-escaped', `<CustomHTMLElement innerHTML="${ESCAPED}" />`],
    ['content, raw in single quotes', `<CustomHTMLElement content='${UNSAFE}' />`],
    ['an escaped text child', `<CustomHTMLElement>${ESCAPED}</CustomHTMLElement>`],
    ['tagName set to script', '<CustomHTMLElement tagName="script" content="shown as text" />'],
  ])('%s', (_label, source) => {
    const doc = domOf(renderPage(`<div><h1>My page</h1>${source}</div>`))
    expectNothingRuns(doc)
    expect(doc.body.textContent).toContain('My page')
  })

  test('a harmless value still shows', () => {
    const doc = domOf(renderPage('<CustomHTMLElement tagName="aside" content="Now playing: Cocteau Twins" />'))
    expect(doc.querySelector('aside')?.textContent).toBe('Now playing: Cocteau Twins')
  })
})
