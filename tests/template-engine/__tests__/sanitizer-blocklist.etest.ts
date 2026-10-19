/**
 * GOLDEN: what the page sanitizer must keep out, now that its allowlist
 * follows how people write pages (marquee, SVG shapes, inputs, media…).
 *
 * Loosening the allowlist is a safety change. These are plain assertions
 * about element and attribute names, checked two ways: against the schema
 * the parser builds, and by compiling markup and looking at what survives.
 * They deliberately contain no working exploit strings.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import { html as htmlSpace } from 'property-information'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { createCustomSchema } from '@/lib/templates/compilation/template-parser'
import { COMPONENT_TAG_PREFIX } from '@/lib/templates/compilation/source-scan'
import { NEVER_ALLOWED_ATTRIBUTES, NEVER_ALLOWED_TAGS } from '@/lib/templates/compilation/html-allowlist'

type Schema = {
  tagNames: string[]
  attributes: Record<string, Array<string | unknown[]>>
  strip: string[]
  protocols: Record<string, string[]>
}

const schema = createCustomSchema() as Schema
const attributeNames = (list: Array<string | unknown[]> = []) =>
  list.map((entry) => (Array.isArray(entry) ? String(entry[0]) : entry))

/** Every event-handler property name the HTML parser can produce (onClick, onLoad…). */
const EVENT_HANDLERS = Object.keys(htmlSpace.property).filter((name) => /^on[A-Z]/.test(name))

const htmlTags = () => [...schema.tagNames.filter((t) => !t.startsWith(COMPONENT_TAG_PREFIX)), '*']

describe('the schema', () => {
  test('knows the event handlers it is checking against', () => {
    expect(EVENT_HANDLERS.length).toBeGreaterThan(50)
    expect(EVENT_HANDLERS).toEqual(expect.arrayContaining(['onClick', 'onError', 'onLoad', 'onMouseOver']))
  })

  test.each([...NEVER_ALLOWED_TAGS])('<%s> is not an allowed tag', (tag) => {
    const lower = tag.toLowerCase()
    expect(schema.tagNames.some((t) => t === tag || t.toLowerCase() === lower)).toBe(false)
  })

  test('script, style, iframe, object, embed, title and noscript go with their content', () => {
    for (const tag of ['script', 'style', 'iframe', 'object', 'embed', 'title', 'noscript', 'template']) {
      expect(schema.strip).toContain(tag)
    }
  })

  test('no element, plain or component, allows an event-handler attribute', () => {
    const offenders: string[] = []
    for (const [tag, list] of Object.entries(schema.attributes)) {
      for (const name of attributeNames(list)) {
        if (/^on[A-Z]/.test(name) || /^on[a-z]+$/.test(name) && EVENT_HANDLERS.some((h) => h.toLowerCase() === name)) {
          offenders.push(`${tag}.${name}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test.each([...NEVER_ALLOWED_ATTRIBUTES])('no plain HTML or SVG element allows %s', (attr) => {
    const offenders = htmlTags().filter((tag) => attributeNames(schema.attributes[tag]).includes(attr))
    expect(offenders).toEqual([])
  })

  test('data-* is not allowed on plain HTML (island markers and the chrome marker stay ours)', () => {
    const offenders = htmlTags().filter((tag) =>
      attributeNames(schema.attributes[tag]).some((name) => name === 'data*' || /^data[A-Z]/.test(name))
    )
    expect(offenders).toEqual([])
  })

  test('every URL-bearing attribute is protocol-checked against http(s)', () => {
    for (const key of ['href', 'src', 'srcSet', 'action', 'poster', 'background', 'cite', 'longDesc']) {
      const protocols = schema.protocols[key]
      expect(protocols).toBeDefined()
      expect(protocols).not.toContain('javascript')
      expect(protocols).not.toContain('vbscript')
    }
    expect(schema.protocols.href).not.toContain('data')
  })

  test('<input> can never be a password or file field', () => {
    const type = schema.attributes.input.find((entry) => Array.isArray(entry) && entry[0] === 'type') as string[]
    expect(type).toBeDefined()
    expect(type).not.toContain('password')
    expect(type).not.toContain('file')
    expect(type).not.toContain('image')
  })

  test('links can only target a new tab or the same one', () => {
    for (const tag of ['a', 'area']) {
      const target = schema.attributes[tag].find((entry) => Array.isArray(entry) && entry[0] === 'target') as string[]
      expect(target.slice(1).sort()).toEqual(['_blank', '_self'])
    }
  })
})

describe('compiled output', () => {
  test.each([...NEVER_ALLOWED_TAGS].filter((t) => !t.includes(':')))('<%s> never reaches the page', (tag) => {
    const svgOnly = /^[a-z]+[A-Z]/.test(tag) || ['set', 'animate', 'discard', 'use', 'image'].includes(tag)
    const markup = svgOnly
      ? `<svg viewBox="0 0 9 9"><${tag}>kept-out</${tag}><rect width="9" height="9"/></svg>`
      : `<div><${tag}>kept-out</${tag}><p>stays</p></div>`
    const { staticHTML } = compileTemplateToArtifacts(markup)
    expect(staticHTML.toLowerCase()).not.toContain(`<${tag.toLowerCase()}`)
  })

  test('raw-text elements take their content with them', () => {
    for (const tag of ['script', 'style', 'iframe', 'noscript', 'title']) {
      const { staticHTML } = compileTemplateToArtifacts(`<div><${tag}>kept-out</${tag}><p>stays</p></div>`)
      expect(staticHTML).not.toContain('kept-out')
      expect(staticHTML).toContain('stays')
    }
  })

  test('every event-handler attribute is dropped from HTML and SVG elements', () => {
    const attrs = EVENT_HANDLERS.map((name) => `${name.toLowerCase()}="x"`).join(' ')
    const { staticHTML } = compileTemplateToArtifacts(
      `<div ${attrs}><a href="/x" ${attrs}>a</a><img src="/a.png" ${attrs}>` +
        `<svg ${attrs}><rect ${attrs} width="1" height="1"/></svg><input type="text" ${attrs}></div>`
    )
    expect(staticHTML).not.toMatch(/\son[a-z]+=/i)
  })

  test('script URLs are dropped from every URL attribute', () => {
    const scheme = ['java', 'script'].join('') + ':'
    const { staticHTML } = compileTemplateToArtifacts(
      `<div><a href="${scheme}x">a</a><img src="${scheme}x"><form action="${scheme}x"><button>b</button></form>` +
        `<video poster="${scheme}x"></video><table background="${scheme}x"><tr><td>c</td></tr></table>` +
        `<area href="${scheme}x"><source src="${scheme}x"></div>`
    )
    expect(staticHTML).not.toContain(scheme)
  })

  test('data: is allowed for images, never for links', () => {
    const { staticHTML } = compileTemplateToArtifacts(
      '<div><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><a href="data:text/plain,x">a</a></div>'
    )
    expect(staticHTML).toContain('src="data:image/gif')
    expect(staticHTML).not.toContain('href="data:')
  })

  test('form submission overrides and auto-focus are dropped', () => {
    const { staticHTML } = compileTemplateToArtifacts(
      '<form action="/x"><button formaction="/y" formtarget="_top" formmethod="post" autofocus>go</button>' +
        '<input type="text" autofocus formaction="/y"></form>'
    )
    expect(staticHTML).not.toMatch(/formaction|formtarget|formmethod|autofocus/i)
  })

  test('island and chrome markers cannot be written by hand', () => {
    const { staticHTML, islands } = compileTemplateToArtifacts(
      '<div data-island="island-guestbook-x" data-component="guestbook" data-site-chrome="true">x</div>'
    )
    expect(islands).toEqual([])
    expect(staticHTML).not.toMatch(/data-island|data-component|data-site-chrome/)
  })

  test('SVG cannot carry foreign HTML, animation, or external references', () => {
    const { staticHTML } = compileTemplateToArtifacts(
      '<svg viewBox="0 0 9 9"><foreignObject><p>x</p></foreignObject>' +
        '<a href="/ok"><set attributeName="fill" to="red"/><animate attributeName="fill"/></a>' +
        '<use href="#a"/><image href="/a.png"/><rect width="9" height="9"/></svg>'
    )
    expect(staticHTML).not.toMatch(/<(foreignobject|set|animate|use|image)\b/i)
    expect(staticHTML).not.toMatch(/attributename/i)
    expect(staticHTML).toContain('<rect width="9" height="9">')
  })

  test('ids and names stay prefixed (no clobbering site globals)', () => {
    const { staticHTML } = compileTemplateToArtifacts(
      '<form name="config"><input type="text" name="user" id="settings"></form><a name="top"></a>'
    )
    expect(staticHTML).not.toMatch(/\s(id|name)="(?!user-content-)/)
  })
})
