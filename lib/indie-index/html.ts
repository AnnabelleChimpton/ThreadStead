/**
 * Just enough HTML reading for the Indie Index (SEARCH_PLAN.md §3.5): links
 * and 88×31 buttons on residents' homes, and the <head> of a fetched
 * homepage. Pure, no I/O, and tolerant of the hand-written HTML personal
 * sites are made of. It never builds a DOM; it scans for the few tags it
 * needs after dropping comments, scripts and styles.
 */
import { decodeEntities, toPlainText } from '@/lib/search/excerpt'
import { BOT_TOKENS } from './public'

export interface PageLink {
  /** Absolute http(s) URL. */
  href: string
  rel: string[]
  /** Its class names, when it has any (microformats like u-like-of live here). */
  classes?: string[]
  /** The link wraps an image sized 88×31: a classic web button. */
  button?: { src: string }
}

export interface HeadInfo {
  title: string | null
  description: string | null
  /** <meta name="robots"> (or a bot-specific one) says noindex or none. */
  noindex: boolean
  /** RSS/Atom/JSON feeds from <link rel="alternate">, absolute URLs. */
  feeds: string[]
}

const NOISE = /<!--[\s\S]*?-->|<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi

/** Drop comments, scripts and styles, whose contents aren't markup. */
function stripNoise(html: string): string {
  return html.replace(NOISE, ' ')
}

/** Attributes of one start tag (`<a href="x" rel=me>` → { href: 'x', rel: 'me' }). */
export function attributesOf(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const body = tag.replace(/^<[a-z0-9]+/i, '').replace(/\/?>$/, '')
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const name = m[1].toLowerCase()
    if (name in attrs) continue
    attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '')
  }
  return attrs
}

/** A URL from an attribute, resolved against `base`, http(s) only. */
export function absoluteUrl(raw: string | undefined, base: string): string | null {
  const value = (raw ?? '').trim()
  if (!value || value.startsWith('#')) return null
  try {
    const url = new URL(value, base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function isButtonImage(attrs: Record<string, string>): boolean {
  const w = parseInt(attrs.width ?? '', 10)
  const h = parseInt(attrs.height ?? '', 10)
  if (w === 88 && h === 31) return true
  const style = (attrs.style ?? '').replace(/\s+/g, '')
  if (/width:88px/i.test(style) && /height:31px/i.test(style)) return true
  // Buttons are often named for their size: mysite-88x31.gif
  return /(^|[^0-9])88x31([^0-9]|$)/i.test(attrs.src ?? '')
}

/**
 * Every http(s) link in a page, in document order (one entry per <a>), with
 * an 88×31 button noted when the link wraps one. `base` resolves relative
 * hrefs; a <base href> in the page wins.
 */
export function extractLinks(html: string, base: string): PageLink[] {
  const clean = stripNoise(html)
  const baseTag = clean.match(/<base\b[^>]*>/i)
  const pageBase = (baseTag && absoluteUrl(attributesOf(baseTag[0]).href, base)) || base

  const links: PageLink[] = []
  const re = /<a\b[^>]*>([\s\S]*?)(?:<\/a\s*>|(?=<a\b)|$)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(clean))) {
    const open = m[0].match(/^<a\b[^>]*>/i)![0]
    const attrs = attributesOf(open)
    const href = absoluteUrl(attrs.href, pageBase)
    if (!href) continue
    const link: PageLink = { href, rel: (attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean) }
    const classes = (attrs.class ?? '').split(/\s+/).filter(Boolean)
    if (classes.length) link.classes = classes
    for (const img of m[1].match(/<img\b[^>]*>/gi) ?? []) {
      const imgAttrs = attributesOf(img)
      const src = absoluteUrl(imgAttrs.src, pageBase)
      if (src && isButtonImage(imgAttrs)) {
        link.button = { src }
        break
      }
    }
    links.push(link)
  }
  return links
}

/** Bare URLs in plain text (bios): https://example.com/path */
export function extractBareUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"'`)\]]+/gi) ?? []).map((u) => u.replace(/[.,;:!?]+$/, ''))
}

/** <rel="me"> links from <a> and <link> tags, absolute. */
export function extractRelMe(html: string, base: string): string[] {
  const out: string[] = []
  for (const tag of stripNoise(html).match(/<(a|link)\b[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag)
    if (!(attrs.rel ?? '').toLowerCase().split(/\s+/).includes('me')) continue
    const href = absoluteUrl(attrs.href, base)
    if (href) out.push(href)
  }
  return out
}

const FEED_TYPES = /^application\/((rss|atom|rdf)\+xml|x-rss\+xml|feed\+json)$/i

/** Title, description, noindex and feed links from a page's <head>. */
export function extractHead(html: string, base: string): HeadInfo {
  const clean = stripNoise(html)
  const head = clean.split(/<body\b/i)[0]

  const titleMatch = head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  const meta: Record<string, string> = {}
  let noindex = false
  const feeds: string[] = []

  for (const tag of head.match(/<(meta|link)\b[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag)
    if (tag[1].toLowerCase() === 'm') {
      const name = (attrs.name ?? attrs.property ?? '').toLowerCase()
      if ((name === 'robots' || BOT_TOKENS.includes(name)) && /\b(noindex|none)\b/i.test(attrs.content ?? '')) noindex = true
      if (name && !(name in meta)) meta[name] = attrs.content ?? ''
      continue
    }
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/)
    if (rel.includes('alternate') && FEED_TYPES.test((attrs.type ?? '').trim())) {
      const href = absoluteUrl(attrs.href, base)
      if (href && !feeds.includes(href)) feeds.push(href)
    }
  }

  const title = toPlainText(titleMatch?.[1] ?? '') || toPlainText(meta['og:title'] ?? '')
  const description = toPlainText(meta.description ?? '') || toPlainText(meta['og:description'] ?? '')
  return {
    title: title.slice(0, 300) || null,
    description: description.slice(0, 1000) || null,
    noindex,
    feeds,
  }
}

/** Robots directives that carry a value after a colon (not a bot name). */
const VALUED_DIRECTIVE = /^(max-snippet|max-image-preview|max-video-preview|unavailable_after)$/i

/**
 * True when an X-Robots-Tag header says noindex (or none) for everyone or
 * for our bot (BOT_TOKENS). "googlebot: noindex" doesn't count.
 */
export function headerSaysNoindex(value: string | null | undefined): boolean {
  if (!value) return false
  let agent: string | null = null
  for (const raw of value.split(',')) {
    let part = raw.trim()
    const prefixed = part.match(/^([a-z0-9_-]+)\s*:\s*(.*)$/i)
    if (prefixed && !VALUED_DIRECTIVE.test(prefixed[1])) {
      agent = prefixed[1].toLowerCase()
      part = prefixed[2].trim()
    }
    if ((agent === null || BOT_TOKENS.includes(agent)) && /^(noindex|none)$/i.test(part)) return true
  }
  return false
}
