import { pageHasMain } from '../page-tree'

test("finds a page's own <main> or role=\"main\", in a page tree or a stored AST", () => {
  expect(pageHasMain({ tree: [{ t: 'div', c: [{ t: 'main', c: ['hi'] }] }] })).toBe(true)
  expect(pageHasMain({ tree: [{ t: 'div', a: [['role', 'main']] }] })).toBe(true)
  expect(pageHasMain({ ast: { children: [{ tagName: 'section', children: [{ tagName: 'main' }] }] } })).toBe(true)
  expect(pageHasMain({ tree: [{ t: 'div', c: ['no landmark'] }] })).toBe(false)
  expect(pageHasMain(null)).toBe(false)
})
