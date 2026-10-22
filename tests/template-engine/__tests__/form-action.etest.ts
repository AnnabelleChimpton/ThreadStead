/**
 * Forms on a page can't post to the site's /api/ routes. A form there would
 * post with the visitor's cookies: sign them out, claim a decoration as them,
 * mark their guestbook read. The sanitizer takes the action out on save
 * (with a warning in the editor) and the page tree leaves it out at render,
 * for pages saved before the rule.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { FORM_ACTION_REMOVED, postsToApi } from '@/lib/templates/compilation/form-action'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import type { PageTreeNode } from '@/lib/templates/rendering/page-tree'

describe('postsToApi', () => {
  test.each([
    '/api/auth/logout',
    '/api',
    '/API/auth/logout',
    'api/auth/logout',
    './api/x',
    '../api/x',
    '../../../api/x',
    'x/../../api/x',
    '/%61pi/x',
    '/api%2Fauth%2Flogout',
    '\\api\\auth\\logout',
    ' /api/x',
    '/a\tpi/x',
    'https://homepageagain.com/api/auth/logout',
    'https://alice.homepageagain.com/api/x',
    '//homepageagain.com/api/x',
    '/api/x?y=1#z',
  ])('%j points at /api/', (action) => {
    expect(postsToApi(action)).toBe(true)
  })

  test.each([
    '',
    '#',
    '?q=1',
    '/search',
    '/apiary',
    '/resident/alice/api/x',
    // protocol-relative: the host is "api", as browsers read it too
    '//api/x',
    'https://example.com/form',
    'mailto:me@example.com',
  ])('%j does not', (action) => {
    expect(postsToApi(action)).toBe(false)
  })

  test('only strings count', () => {
    expect(postsToApi(undefined)).toBe(false)
    expect(postsToApi(['/api/x'])).toBe(false)
  })
})

describe('saving a page', () => {
  test('the action goes, the form and its fields stay, and the editor says why', () => {
    const { staticHTML, warnings } = compileTemplateToArtifacts(
      '<form action="/api/auth/logout" method="post"><button type="submit">Go</button></form>'
    )
    expect(staticHTML).toContain('<form')
    expect(staticHTML).toContain('method="post"')
    expect(staticHTML).toContain('Go</button>')
    expect(staticHTML).not.toContain('action=')
    expect(warnings).toContain(FORM_ACTION_REMOVED)
  })

  test('a form that posts somewhere else keeps its action and gets no warning', () => {
    const { staticHTML, warnings } = compileTemplateToArtifacts('<form action="/search" method="get"><input name="q"></form>')
    expect(staticHTML).toContain('action="/search"')
    expect(warnings).not.toContain(FORM_ACTION_REMOVED)
  })

  test('nested deep in the page counts too', () => {
    const { staticHTML } = compileTemplateToArtifacts(
      '<div><section><form action="../api/decorations/claim/abc" method="post"></form></section></div>'
    )
    expect(staticHTML).not.toContain('action=')
  })
})

describe('rendering a page saved before the rule', () => {
  const attrsOf = (tree: PageTreeNode[], tag: string): Array<[string, string]> | undefined => {
    for (const node of tree) {
      if (typeof node === 'string') continue
      if (node.t === tag) return node.a ?? []
      const found = attrsOf(node.c ?? [], tag)
      if (found) return found
    }
    return undefined
  }

  test('a stored AST with an /api/ action renders without it', () => {
    const ast = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'form',
          properties: { action: '/api/auth/logout', method: 'post' },
          children: [{ type: 'text', value: 'bye' }],
        },
      ],
    }
    const page = pageForRender({ ast, islands: [] })
    expect(attrsOf(page!.tree, 'form')).toEqual([['method', 'post']])
  })

  test('so does an old row with only staticHTML', () => {
    const page = pageForRender({ staticHTML: '<form action="/api/auth/logout" method="post">bye</form>' })
    expect(attrsOf(page!.tree, 'form')).toEqual([['method', 'post']])
  })

  test('other forms keep their action', () => {
    const page = pageForRender({ staticHTML: '<form action="/search">q</form>' })
    expect(attrsOf(page!.tree, 'form')).toEqual([['action', '/search']])
  })
})
