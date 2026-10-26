/**
 * Pasting a whole page (doctype, <head>, <body>) is the normal way people
 * arrive from Neocities. Only the body becomes the page here; this module
 * finds it and keeps the useful bits of the head:
 *  - the <title> text, so it never leaks into the page as visible text
 *    (and can become the page title once advanced pages render on the server);
 *  - Google Fonts <link>s, turned into the @import lines the CSS would need;
 *  - `<body bgcolor text link vlink alink background>`, turned into CSS.
 *    Live and preview CSS both add these (transformAdvancedCss);
 *  - the class, lang, dir and data-* of <html> and <body>, which go on the
 *    page root (pageRootAttributes), and their style="…", turned into CSS;
 *  - theme options, `<meta name="color:Accent" content="#c96633">`, from
 *    anywhere in the source (head or not), taken out before the page is
 *    parsed and turned into CSS variables (theme-options.ts).
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
import { scanThemeOptions, themeOptionsCss, type ThemeOption } from './theme-options'
import { isReservedDataAttribute } from './html-allowlist'

export interface DocumentHead {
  title?: string
  /** `@import url("https://fonts.googleapis.com/…");` lines */
  fontImports: string[]
  /** Other stylesheet links: they can't load here, the report says so */
  otherStylesheets: string[]
  /** The old-web colour attributes on <body>, validated (see legacyBodyCss) */
  body?: LegacyBodyAttributes
  /** Theme options the page declares (only present when it declares some) */
  options?: ThemeOption[]
  /** <html> and <body>'s class, lang, dir and data-*, for the page root */
  root?: PageRootAttributes
  /** Their style="…" declarations */
  htmlStyle?: string
  bodyStyle?: string
}

/**
 * What <html> and <body> carried that the page's CSS reads (`body.dark .x`,
 * `html[data-theme="dark"]`), put on the page root instead, since a page
 * doesn't own the real ones; its CSS is pointed there (scopeAdvancedSelector).
 * They used to be dropped without a word (template audit 02 R7, 03 F8a).
 */
export interface PageRootAttributes {
  className?: string
  /** body's id (else html's), as written: the page root gets it with the user-content- prefix every id has */
  id?: string
  lang?: string
  dir?: string
  data?: Record<string, string>
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

/** Class names, a language tag, a direction and data-* that can go on the page root as they are */
export function validRootAttributes(raw: unknown): PageRootAttributes | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const out: PageRootAttributes = {}
  if (typeof r.className === 'string') {
    const names = r.className.split(/\s+/).filter((name) => /^-?[_a-zA-Z][\w-]{0,60}$/.test(name))
    if (names.length) out.className = [...new Set(names)].slice(0, 20).join(' ')
  }
  // <body id="home">: body#home h1 {} found nothing (bug bash 2026-10-26)
  if (typeof r.id === 'string' && /^[A-Za-z][\w-]{0,60}$/.test(r.id.trim())) out.id = r.id.trim().replace(/^user-content-/, '')
  if (typeof r.lang === 'string' && /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8}){0,3}$/.test(r.lang.trim())) out.lang = r.lang.trim()
  if (typeof r.dir === 'string' && /^(?:ltr|rtl|auto)$/i.test(r.dir.trim())) out.dir = r.dir.trim().toLowerCase()
  if (r.data && typeof r.data === 'object') {
    const data = Object.entries(r.data as Record<string, unknown>).filter(
      (entry): entry is [string, string] =>
        /^data-[a-z0-9-]{1,40}$/.test(entry[0]) && !isReservedDataAttribute(entry[0]) && typeof entry[1] === 'string' && entry[1].length <= 200
    )
    if (data.length) out.data = Object.fromEntries(data.slice(0, 20))
  }
  return Object.keys(out).length ? out : undefined
}

/** A style="…" value that can sit inside a CSS rule: nothing that closes or opens one */
function safeDeclarations(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().replace(/;+$/, '')
  return v && v.length <= 2000 && !/[{}<]|\/\*/.test(v) ? v : undefined
}

/**
 * <html style> and <body style> as CSS, written after the page's own CSS:
 * an inline style beats a stylesheet in a browser.
 */
export function documentStyleCss(head: { htmlStyle?: unknown; bodyStyle?: unknown } | null | undefined): string {
  return [
    safeDeclarations(head?.htmlStyle) && `html { ${safeDeclarations(head?.htmlStyle)}; }`,
    safeDeclarations(head?.bodyStyle) && `body { ${safeDeclarations(head?.bodyStyle)}; }`,
  ].filter(Boolean).join('\n')
}

/** The page root's class, lang, dir and data-* from a stored compiled page, re-validated */
export function pageRootAttributes(compiled: unknown): PageRootAttributes | undefined {
  return validRootAttributes((compiled as { ast?: { head?: { root?: unknown } } } | null | undefined)?.ast?.head?.root)
}

export interface ExtractedDocument {
  isFullDocument: boolean
  /** The markup that becomes the page */
  body: string
  head: DocumentHead
  /** Problems with the page's theme options, for the editor */
  warnings?: string[]
}

/** The source between start and end, without the given spans (and the line break after each). */
function withoutSpans(source: string, spans: Array<{ start: number; end: number }>, start: number, end: number): string {
  let out = ''
  let at = start
  for (const span of spans) {
    if (span.start < at || span.end > end) continue
    out += source.slice(at, span.start)
    at = span.end
    const lineBreak = source.slice(at, end).match(/^[ \t]*\r?\n/)
    if (lineBreak) at += lineBreak[0].length
  }
  return out + source.slice(at, end)
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
  let htmlOpen: Extract<SourceToken, { type: 'open' }> | undefined
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

  const attrs = (token: typeof htmlOpen) =>
    Object.fromEntries((token?.attributes ?? []).map((a) => [a.name.toLowerCase(), decodeBasicEntities(a.value ?? '')]))
  const htmlAttrs = attrs(htmlOpen)
  const bodyAttrs = attrs(bodyOpen)
  const root = validRootAttributes({
    className: [htmlAttrs.class, bodyAttrs.class].filter(Boolean).join(' '),
    id: bodyAttrs.id ?? htmlAttrs.id,
    lang: htmlAttrs.lang ?? bodyAttrs.lang,
    dir: htmlAttrs.dir ?? bodyAttrs.dir,
    data: Object.fromEntries(Object.entries({ ...htmlAttrs, ...bodyAttrs }).filter(([name]) => name.startsWith('data-'))),
  })
  if (root) head.root = root
  const htmlStyle = safeDeclarations(htmlAttrs.style)
  const bodyStyle = safeDeclarations(bodyAttrs.style)
  if (htmlStyle) head.htmlStyle = htmlStyle
  if (bodyStyle) head.bodyStyle = bodyStyle

  // Theme options can sit anywhere; they never become part of the page
  const themeOptions = scanThemeOptions(source, tokens)
  if (themeOptions.options.length > 0) head.options = themeOptions.options
  const warnings = themeOptions.warnings.length > 0 ? { warnings: themeOptions.warnings } : {}

  if (!isFullDocument) {
    const body = themeOptions.spans.length ? withoutSpans(source, themeOptions.spans, 0, source.length) : source
    return { isFullDocument, body, head, ...warnings }
  }

  // Body content: after <body …> (or after </head>, or after <html …>) up to </body> (or </html>)
  const start = bodyOpen?.end ?? headClose?.end ?? htmlOpen?.end ?? 0
  const end = bodyClose && bodyClose.start >= start
    ? bodyClose.start
    : htmlClose && htmlClose.start >= start ? htmlClose.start : source.length
  let body = withoutSpans(source, themeOptions.spans, start, end)

  // No <body> or </head> to start from: drop the head-only elements by hand
  if (!bodyOpen && !headClose) {
    body = body
      .replace(/<head\b[^>]*>|<\/head\s*>/gi, '')
      .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
      .replace(/<(?:meta|link|base)\b[^>]*>/gi, '')
  }
  return { isFullDocument, body: body.trim(), head, ...warnings }
}

/**
 * The CSS a page's head stands for, written before the page's own CSS:
 * its theme options as variables on the root, then its <body bgcolor…>.
 * Both re-validated. The live page and the editor preview both use this.
 */
export function documentHeadCss(head: { body?: unknown; options?: unknown } | null | undefined): string {
  return [
    themeOptionsCss(head?.options),
    legacyBodyCss(head?.body as LegacyBodyAttributes | undefined),
  ].filter(Boolean).join('\n')
}

/**
 * What a compiled page's <head> and <body> tag add to its CSS, read from
 * the stored AST and re-validated (this comes straight from the profile row
 * on every page view).
 */
export function documentCssFromCompiledTemplate(compiled: unknown): { fontImports: string[]; bodyCss: string; styleCss: string; root?: PageRootAttributes } {
  const head = (compiled as { ast?: { head?: { body?: unknown; options?: unknown; htmlStyle?: unknown; bodyStyle?: unknown } } } | null | undefined)?.ast?.head
  return {
    fontImports: fontImportsFromCompiledTemplate(compiled),
    bodyCss: documentHeadCss(head),
    styleCss: documentStyleCss(head),
    root: pageRootAttributes(compiled),
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
