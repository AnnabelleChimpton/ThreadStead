/**
 * Class names a page shares with the site's own CSS. A page from Neocities
 * with class="container" or class="hidden" picks up the site's rules for
 * those names as well as its own (a width, display: none), and nothing in
 * its code says why.
 *
 * Worked out in the preview, which has the site's CSS as the live page does
 * (pages/template-preview.tsx): a page's class counts only when one of the
 * site's rules really matches an element of the page with it. Rules the
 * site keeps off pages (:where(:not([data-template-root] *))) don't match,
 * and components' own markup (<ts-island>) and the site's chrome aren't the
 * page's. The editor lists them under the code (classClashWarnings).
 */
import { lineAt, tokenizeSource } from '@/lib/templates/compilation/source-scan'

/** The site's names a page uses on purpose: the site's look, and components' parts */
const ON_PURPOSE = /^(ts-|thread-)/
const CLASS_IN_SELECTOR = /\.(-?[_a-zA-Z][\w-]*)/g
/** States and parts an element isn't in while it's checked */
const STATES = /::?(hover|focus|focus-visible|focus-within|active|visited|before|after|placeholder|marker|selection|first-letter|first-line)\b/g
/** The page's own CSS (pages/_app.tsx and the preview give it these ids) */
const PAGE_SHEETS = new Set(['advanced-template-css', 'profile-page-styles'])

function matches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector.replace(STATES, ''))
  } catch {
    return false
  }
}

/** The page's class names the site's CSS styles, in the order the page first uses them */
export function siteClassClashes(doc: Document): string[] {
  const root = doc.querySelector('[data-template-root]')
  if (!root) return []
  const byName = new Map<string, Element[]>()
  for (const element of Array.from(root.querySelectorAll('[class]'))) {
    if (element.closest('ts-island, [data-site-chrome]')) continue
    for (const name of Array.from(element.classList)) {
      if (ON_PURPOSE.test(name)) continue
      const list = byName.get(name)
      if (list) list.push(element)
      else byName.set(name, [element])
    }
  }
  if (byName.size === 0) return []

  const clashing = new Set<string>()
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      // Rules for components' islands only (@scope (ts-island) to ([data-ts-page]))
      if (typeof CSSScopeRule !== 'undefined' && rule instanceof CSSScopeRule) continue
      if ('selectorText' in rule && typeof rule.selectorText === 'string') {
        const selector = rule.selectorText
        for (const [, name] of Array.from(selector.matchAll(CLASS_IN_SELECTOR))) {
          if (clashing.has(name)) continue
          const elements = byName.get(name)
          if (elements?.some((element) => matches(element, selector))) clashing.add(name)
        }
      } else if ('cssRules' in rule && rule.cssRules) {
        // @media, @supports, @layer blocks
        walk(rule.cssRules as CSSRuleList)
      }
    }
  }
  for (const element of Array.from(doc.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel~="stylesheet"]'))) {
    if (PAGE_SHEETS.has(element.id) || !element.sheet) continue
    try {
      walk(element.sheet.cssRules)
    } catch {
      // Another site's stylesheet (fonts) can't be read, and isn't the site's
    }
  }
  return Array.from(byName.keys()).filter((name) => clashing.has(name))
}

const quoted = (names: string[]) => {
  const q = names.map((name) => `"${name}"`)
  return q.length === 1 ? q[0] : `${q.slice(0, -1).join(', ')} and ${q[q.length - 1]}`
}

/**
 * "Line 4: …" for the names first used on each line, so a page with a dozen
 * of them gets a line each, not a dozen copies of the same sentence
 */
export function classClashWarnings(source: string, names: string[]): string[] {
  if (names.length === 0) return []
  const firstLine = new Map<string, number>()
  for (const token of tokenizeSource(source)) {
    if (token.type !== 'open') continue
    const value = token.attributes.find((a) => a.name.toLowerCase() === 'class')?.value
    if (!value) continue
    for (const name of value.split(/\s+/)) {
      if (names.includes(name) && !firstLine.has(name)) firstLine.set(name, lineAt(source, token.start))
    }
  }
  const byLine = new Map<number, string[]>()
  for (const name of names) {
    const line = firstLine.get(name) ?? 0
    byLine.set(line, [...(byLine.get(line) ?? []), name])
  }
  return Array.from(byLine.entries())
    .sort(([a], [b]) => a - b)
    .map(([line, onLine]) => {
      const one = onLine.length === 1
      const words = `${one ? 'The class' : 'The classes'} ${quoted(onLine)} ${one ? 'gets' : 'get'} the site's styles as well as yours, because the site uses ${one ? 'that name' : 'those names'} too. ${one ? 'Another name keeps it' : 'Other names keep them'} yours.`
      return line ? `Line ${line}: ${words}` : words
    })
}
