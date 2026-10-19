/**
 * A small, forgiving HTML tokenizer over the template SOURCE, used before
 * parse5 sees it. Three jobs need the source as written:
 *  - the syntax pre-check (template-parser detectSyntaxErrors),
 *  - the stripped-tag report (what went in vs what came out),
 *  - prepareSourceForParse: component tags are recognised by their
 *    PascalCase spelling, which the HTML parser lowercases away.
 *
 * It follows the HTML spec where it matters for those jobs: comments,
 * doctypes and the contents of raw-text elements (script, style, textarea,
 * title…) are never read as tags, and attribute quotes only open after '='.
 * It never throws and never drops text: every character of the input lands
 * in exactly one token.
 */

export interface SourceAttribute {
  name: string
  /** Raw value as written (entities NOT decoded); undefined for bare attributes */
  value?: string
  /** Source index range of the whole attribute (name through value) */
  start: number
  end: number
}

export type SourceToken =
  | { type: 'text'; start: number; end: number }
  | { type: 'comment'; start: number; end: number }
  | { type: 'doctype'; start: number; end: number }
  | {
      type: 'open'
      /** Tag name exactly as written (case kept) */
      name: string
      start: number
      end: number
      /** Index just past the tag name */
      nameEnd: number
      attributes: SourceAttribute[]
      selfClosing: boolean
      /** The tag ran to the end of the input without a closing '>' */
      unterminated: boolean
      /** An attribute name contains a quote: almost always a value whose quote never closed */
      strayQuote: boolean
      /** An attribute name contains '<': usually text like "a<b" the parser reads as a tag */
      strayLessThan: boolean
    }
  | { type: 'close'; name: string; start: number; end: number; unterminated: boolean }

/** Elements whose content is text to the HTML parser, never tags. */
const RAW_TEXT_ELEMENTS = new Set([
  'script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript',
])

/** HTML void elements: never have content or a closing tag. */
export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
])

/**
 * Component tags are written in PascalCase: a capital first letter and at
 * least one lowercase letter. `<Button>` is the component, `<button>` and
 * the all-caps `<BUTTON>` of a 2003 page are HTML.
 */
export function looksLikeComponentName(name: string): boolean {
  return /^[A-Z]/.test(name) && /[a-z]/.test(name)
}

export function lineAt(source: string, index: number): number {
  let line = 1
  for (let i = 0; i < index && i < source.length; i++) {
    if (source.charCodeAt(i) === 10) line++
  }
  return line
}

export function tokenizeSource(source: string): SourceToken[] {
  const tokens: SourceToken[] = []
  const len = source.length
  let i = 0
  let textStart = 0

  const flushText = (upTo: number) => {
    if (upTo > textStart) tokens.push({ type: 'text', start: textStart, end: upTo })
  }

  while (i < len) {
    if (source[i] !== '<') {
      i++
      continue
    }
    const next = source[i + 1] || ''

    // <!-- comment -->
    if (source.startsWith('<!--', i)) {
      flushText(i)
      const close = source.indexOf('-->', i + 4)
      const end = close === -1 ? len : close + 3
      tokens.push({ type: 'comment', start: i, end })
      i = textStart = end
      continue
    }

    // <!doctype …>, <![CDATA[…]]> and <?…> are skipped like the parser does
    if (next === '!' || next === '?') {
      flushText(i)
      const close = source.indexOf('>', i + 2)
      const end = close === -1 ? len : close + 1
      tokens.push({ type: 'doctype', start: i, end })
      i = textStart = end
      continue
    }

    // </name …>
    if (next === '/' && /[A-Za-z]/.test(source[i + 2] || '')) {
      flushText(i)
      const nameStart = i + 2
      let j = nameStart
      while (j < len && !/[\s/>]/.test(source[j])) j++
      const name = source.slice(nameStart, j)
      const close = source.indexOf('>', j)
      const end = close === -1 ? len : close + 1
      tokens.push({ type: 'close', name, start: i, end, unterminated: close === -1 })
      i = textStart = end
      continue
    }

    // <name …>
    if (/[A-Za-z]/.test(next)) {
      flushText(i)
      const open = readOpenTag(source, i)
      tokens.push(open)
      i = textStart = open.end

      // Raw-text content runs to the matching end tag, whatever it contains
      const lower = open.name.toLowerCase()
      if (RAW_TEXT_ELEMENTS.has(lower) && !open.selfClosing && !open.unterminated) {
        const closeRe = new RegExp(`</${lower}(?=[\\s/>])`, 'ig')
        closeRe.lastIndex = i
        const m = closeRe.exec(source)
        const contentEnd = m ? m.index : len
        if (contentEnd > i) tokens.push({ type: 'text', start: i, end: contentEnd })
        i = textStart = contentEnd
      }
      continue
    }

    // A '<' that starts nothing ("x < y", "<3") is text
    i++
  }
  flushText(len)
  return tokens
}

function readOpenTag(source: string, start: number): Extract<SourceToken, { type: 'open' }> {
  const len = source.length
  let j = start + 1
  while (j < len && !/[\s/>]/.test(source[j])) j++
  const name = source.slice(start + 1, j)
  const nameEnd = j
  const attributes: SourceAttribute[] = []
  let selfClosing = false
  let strayQuote = false
  let strayLessThan = false

  while (j < len) {
    const ch = source[j]
    if (/\s/.test(ch)) {
      j++
      continue
    }
    if (ch === '>') {
      return { type: 'open', name, start, end: j + 1, nameEnd, attributes, selfClosing, unterminated: false, strayQuote, strayLessThan }
    }
    if (ch === '/') {
      selfClosing = source[j + 1] === '>'
      j++
      continue
    }
    selfClosing = false

    // Attribute name: up to whitespace, '=', '>' or '/' (a leading '=' is part of it, per spec)
    const attrStart = j
    j++
    while (j < len && !/[\s/>=]/.test(source[j])) j++
    const attrName = source.slice(attrStart, j)
    if (/["']/.test(attrName)) strayQuote = true
    if (attrName.includes('<')) strayLessThan = true

    let k = j
    while (k < len && /\s/.test(source[k])) k++
    if (source[k] !== '=') {
      attributes.push({ name: attrName, start: attrStart, end: j })
      continue
    }
    k++
    while (k < len && /\s/.test(source[k])) k++
    const quote = source[k]
    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, k + 1)
      if (close === -1) {
        // The quote never closes: the tag swallows the rest of the page
        attributes.push({ name: attrName, value: source.slice(k + 1), start: attrStart, end: len })
        return { type: 'open', name, start, end: len, nameEnd, attributes, selfClosing: false, unterminated: true, strayQuote: true, strayLessThan }
      }
      attributes.push({ name: attrName, value: source.slice(k + 1, close), start: attrStart, end: close + 1 })
      j = close + 1
    } else {
      let v = k
      while (v < len && !/[\s>]/.test(source[v])) v++
      attributes.push({ name: attrName, value: source.slice(k, v), start: attrStart, end: v })
      j = v
    }
  }
  return { type: 'open', name, start, end: len, nameEnd, attributes, selfClosing: false, unterminated: true, strayQuote, strayLessThan }
}

/**
 * Prefix the parser keeps on component tags. parse5 lowercases tag names,
 * so `<Button>` and `<button>` would arrive identical; renaming the
 * component spelling first keeps the difference through parsing and
 * sanitizing. template-parser strips it again and marks the node.
 */
export const COMPONENT_TAG_PREFIX = 'ts-component-'

/**
 * Rewrite the source for the HTML parser:
 *  - PascalCase tags that `isComponent` recognises become
 *    `<ts-component-name>` (open and close), so they survive lowercasing.
 *  - `<Tag />` on anything but a void element becomes `<Tag></Tag>`:
 *    HTML ignores the slash, and components and JSX-minded authors rely
 *    on it. Void elements (`<br/>`, `<img/>`) are left alone; turning
 *    them into `<br></br>` gave every self-closed line break twice.
 * Comments, doctypes and raw-text content pass through untouched.
 */
export function prepareSourceForParse(source: string, isComponent: (name: string) => boolean): string {
  let out = ''
  for (const token of tokenizeSource(source)) {
    if (token.type === 'open') {
      const component = looksLikeComponentName(token.name) && isComponent(token.name)
      const name = component ? COMPONENT_TAG_PREFIX + token.name.toLowerCase() : token.name
      let attrs = source.slice(token.nameEnd, token.end)
      if (token.name.toLowerCase() === 'font') attrs = absoluteFontSize(token, source, attrs)
      if (token.selfClosing && !VOID_ELEMENTS.has(token.name.toLowerCase())) {
        // Drop the '/' before '>' and add the closing tag
        out += `<${name}${attrs.slice(0, -2).replace(/\s*$/, '')}></${name}>`
      } else {
        out += `<${name}${attrs}`
      }
      continue
    }
    if (token.type === 'close' && looksLikeComponentName(token.name) && isComponent(token.name)) {
      out += `</${COMPONENT_TAG_PREFIX}${token.name.toLowerCase()}${source.slice(token.start + 2 + token.name.length, token.end)}`
      continue
    }
    out += source.slice(token.start, token.end)
  }
  return out
}

/**
 * `<font size="+3">` is relative to the default size 3 (HTML's legacy font
 * size rules). The HTML parser reads `size` as a number and drops the plus
 * sign, which turned +3 (size 6) into size 3, so write it as the absolute
 * size browsers compute.
 */
function absoluteFontSize(
  token: Extract<SourceToken, { type: 'open' }>,
  source: string,
  attrs: string
): string {
  const size = token.attributes.find((a) => a.name.toLowerCase() === 'size')
  const m = size?.value?.trim().match(/^\+(\d+)/)
  if (!size || !m) return attrs
  const absolute = Math.min(7, 3 + parseInt(m[1], 10))
  const offset = token.nameEnd
  return attrs.slice(0, size.start - offset) + `size="${absolute}"` + attrs.slice(size.end - offset)
}
