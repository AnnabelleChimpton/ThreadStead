/**
 * styles/preflight.css is Tailwind's preflight twice: once with each
 * selector kept off a page of someone's own HTML, and once for the
 * components inside such a page (@scope (ts-island)). Both must stay
 * Tailwind's otherwise, rule for rule, so an upgrade that changes preflight
 * fails here instead of drifting.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../..')
const PAGE = ':where(:not([data-template-root] *))'
const OFF_PAGE = ':where(:not(:has([data-site-styles="off"])))'

/** Each rule as "selector, selector { decl; decl }", whitespace and comments gone */
function rules(css: string): string[] {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, prelude, body]) => {
    const selectors = prelude.replace(/\s+/g, ' ').trim().split(/\s*,\s*(?![^(]*\))/)
    const decls = body.split(';').map((d) => d.replace(/\s+/g, ' ').trim()).filter(Boolean)
    return `${selectors.join(', ')} { ${decls.join('; ')} }`
  })
}

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')
const tailwind = rules(read('node_modules/tailwindcss/preflight.css'))
const [site, components] = read('styles/preflight.css').split('@scope (ts-island) to ([data-ts-page])').map(rules)

test("the site's preflight is Tailwind's, kept off the page", () => {
  expect(site.map((rule) => rule.split(PAGE).join('').split(OFF_PAGE).join(''))).toEqual(tailwind)
})

test("the components' is Tailwind's, all but the root rule", () => {
  expect(components).toEqual(tailwind.filter((rule) => !rule.startsWith('html, :host')))
})

test('every selector but the root ones skips the page', () => {
  for (const rule of site) {
    for (const selector of rule.slice(0, rule.indexOf(' {')).split(/, (?![^(]*\))/)) {
      if (selector === ':host') continue
      expect(selector.includes(PAGE) || selector.includes(OFF_PAGE)).toBe(true)
    }
  }
})
