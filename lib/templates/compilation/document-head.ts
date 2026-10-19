/**
 * Pasting a whole page (doctype, <head>, <body>) is the normal way people
 * arrive from Neocities. Only the body becomes the page here; this module
 * finds it and keeps the useful bits of the head:
 *  - the <title> text, so it never leaks into the page as visible text
 *    (and can become the page title once advanced pages render on the server);
 *  - Google Fonts <link>s, turned into the @import lines the CSS would need;
 *  - `<body bgcolor text link vlink alink background>`, turned into CSS.
 *    Live and preview CSS both add these (transformAdvancedCss).
 *
 * Detection is case-insensitive and attribute-tolerant: `<!doctype html>`,
 * `<HTML>` and `<body class="dark">` all count. It used to look for the
 * exact strings "<!DOCTYPE" or "<html" plus a bare "<body>", so a modern
 * lowercase page with body attributes was compiled as a fragment and its
 * <title> showed up as text at the top.
 *
 * Kept free of server-only imports: pages/_app.tsx reads the font imports.
 */
import { tokenizeSource, type SourceToken } from './source-scan'

export interface DocumentHead {
  title?: string
  /** `@import url("https://fonts.googleapis.com/…");` lines */
  fontImports: string[]
  /** Other stylesheet links: they can't load here, the report says so */
  otherStylesheets: string[]
  /** The old-web colour attributes on <body>, validated (see legacyBodyCss) */
  body?: LegacyBodyAttributes
}

/** `<body bgcolor text link vlink alink background>` */
export interface LegacyBodyAttributes {
  bgColor?: string
  text?: string
  link?: string
  vLink?: string
  aLink?: string
  background?: string
}

const BODY_ATTRIBUTES: Record<string, keyof LegacyBodyAttributes> = {
  bgcolor: 'bgColor', text: 'text', link: 'link', vlink: 'vLink', alink: 'aLink', background: 'background',
}

/** A colour as old pages write it: #rgb/#rrggbb, bare hex, or a colour name. */
function safeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v
  if (/^(?:[0-9a-f]{6})$/i.test(v)) return '#' + v
  if (/^[a-z]{3,20}$/i.test(v)) return v.toLowerCase()
  return undefined
}

/** An https image URL with nothing in it that could leave url("…"). */
function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  return /^https:\/\/[^\s"'()\\<>]+$/.test(v) ? v : undefined
}

function validBodyAttributes(raw: Record<string, unknown> | undefined): LegacyBodyAttributes | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: LegacyBodyAttributes = {}
  for (const key of ['bgColor', 'text', 'link', 'vLink', 'aLink'] as const) {
    const color = safeColor(raw[key])
    if (color) out[key] = color
  }
  const background = safeImageUrl(raw.background)
  if (background) out.background = background
  return Object.keys(out).length ? out : undefined
}

/**
 * CSS for `<body bgcolor text link…>`, written before the page's own CSS
 * so the page's rules still win (as they do over these attributes in a
 * browser). Link colours sit behind :where() for the same reason.
 */
export function legacyBodyCss(body: LegacyBodyAttributes | undefined): string {
  const b = validBodyAttributes(body as Record<string, unknown> | undefined)
  if (!b) return ''
  const rules: string[] = []
  const decls = [
    b.bgColor && `background-color: ${b.bgColor}`,
    b.text && `color: ${b.text}`,
    b.background && `background-image: url("${b.background}")`,
  ].filter(Boolean)
  if (decls.length) rules.push(`body { ${decls.join('; ')}; }`)
  if (b.link) rules.push(`body :where(a:link) { color: ${b.link}; }`)
  if (b.vLink) rules.push(`body :where(a:visited) { color: ${b.vLink}; }`)
  if (b.aLink) rules.push(`body :where(a:active) { color: ${b.aLink}; }`)
  return rules.join('\n')
}

export interface ExtractedDocument {
  isFullDocument: boolean
  /** The markup that becomes the page */
  body: string
  head: DocumentHead
}

const GOOGLE_FONTS_CSS = /^https:\/\/fonts\.googleapis\.com\/css2?\?/i

export function isGoogleFontsStylesheet(href: string): boolean {
  return GOOGLE_FONTS_CSS.test(href.trim())
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** The @import line a Google Fonts stylesheet link stands for. */
export function googleFontsImport(href: string): string {
  // A double quote can't appear in a valid Google Fonts URL; refuse rather than escape
  const url = decodeBasicEntities(href.trim())
  return `@import url("${url.replace(/"/g, '%22')}");`
}

export function extractDocument(source: string): ExtractedDocument {
  const tokens = tokenizeSource(source)
  const head: DocumentHead = { fontImports: [], otherStylesheets: [] }

  let isFullDocument = false
  let bodyOpen: Extract<SourceToken, { type: 'open' }> | undefined
  let bodyClose: SourceToken | undefined
  let headClose: SourceToken | undefined
  let htmlOpen: SourceToken | undefined
  let htmlClose: SourceToken | undefined

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t]
    if (token.type === 'doctype' && /^<!doctype/i.test(source.slice(token.start, token.start + 9))) {
      isFullDocument = true
      continue
    }
    if (token.type !== 'open' && token.type !== 'close') continue
    const name = token.name.toLowerCase()

    if (token.type === 'open') {
      if (name === 'html') {
        isFullDocument = true
        htmlOpen ??= token
      } else if (name === 'head') {
        isFullDocument = true
      } else if (name === 'body') {
        isFullDocument = true
        if (!bodyOpen) {
          bodyOpen = token
          const raw: Record<string, string> = {}
          for (const attr of token.attributes) {
            const key = BODY_ATTRIBUTES[attr.name.toLowerCase()]
            if (key && attr.value !== undefined) raw[key] = decodeBasicEntities(attr.value)
          }
          head.body = validBodyAttributes(raw)
        }
      } else if (name === 'title' && head.title === undefined) {
        const content = tokens[t + 1]
        head.title = content && content.type === 'text'
          ? decodeBasicEntities(source.slice(content.start, content.end)).replace(/\s+/g, ' ').trim()
          : ''
      } else if (name === 'link') {
        const attr = (n: string) => token.attributes.find((a) => a.name.toLowerCase() === n)?.value
        const rel = (attr('rel') || '').toLowerCase().split(/\s+/)
        const href = attr('href')
        if (rel.includes('stylesheet') && href) {
          if (isGoogleFontsStylesheet(decodeBasicEntities(href))) {
            const line = googleFontsImport(href)
            if (!head.fontImports.includes(line)) head.fontImports.push(line)
          } else {
            head.otherStylesheets.push(decodeBasicEntities(href))
          }
        }
      }
    } else {
      if (name === 'head') headClose ??= token
      else if (name === 'body') bodyClose = token
      else if (name === 'html') htmlClose = token
    }
  }

  if (!isFullDocument) return { isFullDocument, body: source, head }

  // Body content: after <body …> (or after </head>, or after <html …>) up to </body> (or </html>)
  const start = bodyOpen?.end ?? headClose?.end ?? htmlOpen?.end ?? 0
  const end = bodyClose && bodyClose.start >= start
    ? bodyClose.start
    : htmlClose && htmlClose.start >= start ? htmlClose.start : source.length
  let body = source.slice(start, end)

  // No <body> or </head> to start from: drop the head-only elements by hand
  if (!bodyOpen && !headClose) {
    body = body
      .replace(/<head\b[^>]*>|<\/head\s*>/gi, '')
      .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
      .replace(/<(?:meta|link|base)\b[^>]*>/gi, '')
  }
  return { isFullDocument, body: body.trim(), head }
}

/**
 * What a compiled page's <head> and <body> tag add to its CSS, read from
 * the stored AST and re-validated (this comes straight from the profile row
 * on every page view).
 */
export function documentCssFromCompiledTemplate(compiled: unknown): { fontImports: string[]; bodyCss: string } {
  const head = (compiled as { ast?: { head?: { body?: unknown } } } | null | undefined)?.ast?.head
  return {
    fontImports: fontImportsFromCompiledTemplate(compiled),
    bodyCss: legacyBodyCss(head?.body as LegacyBodyAttributes | undefined),
  }
}

/**
 * Font imports stored with a compiled page (on its AST root, see
 * compileTemplate). Re-checked against the Google Fonts pattern.
 */
export function fontImportsFromCompiledTemplate(compiled: unknown): string[] {
  const head = (compiled as { ast?: { head?: { fontImports?: unknown } } } | null | undefined)?.ast?.head
  const lines = Array.isArray(head?.fontImports) ? head.fontImports : []
  return lines.filter(
    (line): line is string =>
      typeof line === 'string' &&
      /^@import url\("https:\/\/fonts\.googleapis\.com\/css2?\?[^"<>\\]*"\);$/i.test(line)
  )
}
