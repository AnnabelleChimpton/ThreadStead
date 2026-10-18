/**
 * Feed reading for the Indie Index (SEARCH_PLAN.md §3.5): RSS 2.0, RSS 1.0
 * (RDF), Atom and JSON Feed → plain-text items. Pure, no I/O.
 */
import { XMLParser } from 'fast-xml-parser'
import { toPlainText } from '@/lib/search/excerpt'
import { absoluteUrl } from './html'

export interface FeedItem {
  url: string
  title: string | null
  /** The whole entry as one line of plain text; cut with excerptOf(). */
  text: string
  publishedAt: Date | null
}

export interface ParsedFeed {
  title: string | null
  /** The site the feed belongs to (channel link / alternate link). */
  siteUrl: string | null
  description: string | null
  items: FeedItem[]
}

type Node = unknown

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => ['item', 'entry', 'link'].includes(name),
  // Entry bodies stay raw: parsing them as XML loses the order of mixed
  // content (Atom xhtml), and RSS escapes its HTML anyway. bodyText() reads them.
  stopNodes: ['*.content', '*.content:encoded', '*.description', '*.summary'],
})

function asArray(node: Node): Node[] {
  if (node === undefined || node === null) return []
  return Array.isArray(node) ? node : [node]
}

/** All text inside a node (Atom xhtml content is nested markup), attributes skipped. */
function textOf(node: Node): string {
  if (node === undefined || node === null) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number' || typeof node === 'boolean') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  if (typeof node === 'object') {
    return Object.entries(node as Record<string, Node>)
      .filter(([key]) => !key.startsWith('@_'))
      .map(([, value]) => textOf(value))
      .join(' ')
  }
  return ''
}

function attr(node: Node, name: string): string | undefined {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const value = (node as Record<string, Node>)[`@_${name}`]
    return typeof value === 'string' ? value : undefined
  }
  return undefined
}

function plain(node: Node): string | null {
  return toPlainText(textOf(node)) || null
}

/**
 * A raw entry body → plain text. Bodies come as CDATA, as escaped HTML
 * (`&lt;p&gt;`) or as inline xhtml, so: unwrap CDATA, then strip tags and
 * decode entities twice (the first pass can uncover escaped tags).
 */
function bodyText(node: Node): string {
  const raw = textOf(node).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  // Tags become spaces, which leaves `<b>there</b>.` as "there ."
  return toPlainText(toPlainText(raw)).replace(/ ([.,;:!?)])/g, '$1')
}

export function parseDate(raw: Node): Date | null {
  const text = textOf(raw).trim()
  if (!text) return null
  const ms = Date.parse(text)
  return Number.isFinite(ms) ? new Date(ms) : null
}

/** First <link> that's an alternate page (Atom), or the RSS link text. */
function linkOf(links: Node, base: string): string | null {
  for (const link of asArray(links)) {
    if (typeof link === 'string') {
      const url = absoluteUrl(link, base)
      if (url) return url
      continue
    }
    const rel = attr(link, 'rel') ?? 'alternate'
    if (rel !== 'alternate') continue
    const url = absoluteUrl(attr(link, 'href') ?? textOf(link), base)
    if (url) return url
  }
  return null
}

function guidUrl(guid: Node, base: string): string | null {
  if (attr(guid, 'isPermaLink') === 'false') return null
  const text = textOf(guid).trim()
  return /^https?:\/\//i.test(text) ? absoluteUrl(text, base) : null
}

function rssItems(items: Node[], base: string): FeedItem[] {
  const out: FeedItem[] = []
  for (const raw of items) {
    const item = (raw ?? {}) as Record<string, Node>
    const url = linkOf(item.link, base) ?? guidUrl(item.guid, base)
    if (!url) continue
    out.push({
      url,
      title: plain(item.title),
      text: bodyText(item['content:encoded'] ?? item.description ?? ''),
      publishedAt: parseDate(item.pubDate ?? item['dc:date'] ?? item.published ?? item.updated),
    })
  }
  return out
}

function atomItems(entries: Node[], base: string): FeedItem[] {
  const out: FeedItem[] = []
  for (const raw of entries) {
    const entry = (raw ?? {}) as Record<string, Node>
    const url = linkOf(entry.link, base) ?? (typeof entry.id === 'string' && /^https?:/i.test(entry.id) ? entry.id : null)
    if (!url) continue
    out.push({
      url,
      title: plain(entry.title),
      text: bodyText(entry.content ?? entry.summary ?? ''),
      publishedAt: parseDate(entry.published ?? entry.updated ?? entry.issued),
    })
  }
  return out
}

function parseJsonFeed(body: string, base: string): ParsedFeed | null {
  let doc: Record<string, unknown>
  try {
    doc = JSON.parse(body)
  } catch {
    return null
  }
  if (!doc || typeof doc !== 'object' || !String(doc.version ?? '').startsWith('https://jsonfeed.org/version/')) return null
  const items: FeedItem[] = []
  for (const raw of Array.isArray(doc.items) ? doc.items : []) {
    const item = (raw ?? {}) as Record<string, unknown>
    const url = absoluteUrl(typeof item.url === 'string' ? item.url : typeof item.external_url === 'string' ? item.external_url : undefined, base)
    if (!url) continue
    items.push({
      url,
      title: toPlainText(String(item.title ?? '')) || null,
      text: toPlainText(String(item.content_text ?? item.content_html ?? item.summary ?? '')),
      publishedAt: parseDate(String(item.date_published ?? item.date_modified ?? '')),
    })
  }
  return {
    title: toPlainText(String(doc.title ?? '')) || null,
    siteUrl: absoluteUrl(typeof doc.home_page_url === 'string' ? doc.home_page_url : undefined, base),
    description: toPlainText(String(doc.description ?? '')) || null,
    items,
  }
}

/**
 * Parse a feed body. `base` (the feed's own URL) resolves relative links.
 * Returns null for anything that isn't a feed, an HTML page included.
 */
export function parseFeed(body: string, base: string): ParsedFeed | null {
  const start = body.replace(/^﻿/, '').trimStart()
  if (start.startsWith('{')) return parseJsonFeed(start, base)
  if (!start.startsWith('<')) return null

  // Feeds don't need a DOCTYPE, and its entity declarations are the classic
  // way to blow up an XML parser.
  const xml = start.replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/gi, '')
  let doc: Record<string, Node>
  try {
    doc = parser.parse(xml) as Record<string, Node>
  } catch {
    return null
  }

  const rss = doc.rss as Record<string, Node> | undefined
  if (rss && typeof rss === 'object') {
    const channel = (rss.channel ?? {}) as Record<string, Node>
    return {
      title: plain(channel.title),
      siteUrl: linkOf(channel.link, base),
      description: bodyText(channel.description) || null,
      items: rssItems(asArray(channel.item), base),
    }
  }

  const rdf = doc['rdf:RDF'] as Record<string, Node> | undefined
  if (rdf && typeof rdf === 'object') {
    const channel = (rdf.channel ?? {}) as Record<string, Node>
    return {
      title: plain(channel.title),
      siteUrl: linkOf(channel.link, base),
      description: bodyText(channel.description) || null,
      items: rssItems(asArray(rdf.item ?? channel.item), base),
    }
  }

  const feed = doc.feed as Record<string, Node> | undefined
  if (feed && typeof feed === 'object') {
    const feedBase = absoluteUrl(attr(feed, 'xml:base'), base) ?? base
    return {
      title: plain(feed.title),
      siteUrl: linkOf(feed.link, feedBase),
      description: plain(feed.subtitle),
      items: atomItems(asArray(feed.entry), feedBase),
    }
  }

  return null
}

/** Cut plain text to at most `limit` characters, on a word boundary, with an ellipsis. */
export function excerptOf(text: string, limit: number): string | null {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`
}

/**
 * A feed's title as a site name. Strips a "— Everything Feed" style tail
 * after a separator, or a bare " Feed"/" RSS" when what's left is the site's
 * own name ("Ratfactor Feed" on ratfactor.com). A blog really called
 * "Sunday Feed" keeps its name. Titles that are only "RSS Feed" come back null.
 */
export function siteNameFromFeedTitle(title: string | null, host?: string): string | null {
  const clean = (title ?? '').trim()
  if (!clean || /^(?:(?:the|rss|atom|json)\s+)*(?:feed|rss)$/i.test(clean)) return null
  const afterSeparator = clean.replace(/\s+[-–—|:·]\s+(?:(?:the|everything|all|main|blog|posts?|articles?|rss|atom|json)\s+)*(?:feed|rss)$/i, '').trim()
  if (afterSeparator !== clean) return afterSeparator || null
  const bare = clean.replace(/\s+(?:rss|atom)?\s*(?:feed|rss)$/i, '').trim()
  const squash = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')
  const label = (host ?? '').replace(/^www\./, '').split('.')[0]
  return bare !== clean && label && squash(bare) === squash(label) ? bare : clean
}
