/**
 * @jest-environment node
 *
 * <CustomHTMLElement content="…"> (and innerHTML="…", and a text child)
 * carries HTML inside an attribute value, where the page sanitizer never
 * looks. The component cleans it at render with the page's own sanitizer,
 * so rows saved before that check are covered too. These render to server
 * HTML, parse it into a browser DOM, and check that event handlers and
 * scripts don't reach it. Payloads are inert on purpose.
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
import { componentRegistry } from '@/lib/templates/core/template-registry'

const UNSAFE = '<p>stays</p><img src="/a.png" onerror="x"><b onclick="x">bold</b><script>kept-out</script>'

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
