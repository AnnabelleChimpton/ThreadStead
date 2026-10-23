/**
 * RSS 2.0, the plain kind every feed reader understands: one channel, items
 * with the whole post in content:encoded. Used by a resident's feed and a
 * ring's (lib/feeds/resident-feed.ts, lib/feeds/ring-feed.ts).
 */

/** Items in a feed: the newest few, as a reader shows them */
export const FEED_LENGTH = 20

export interface FeedItem {
  title: string
  /** The post's page; also its guid */
  url: string
  publishedAt: Date
  author?: string
  /** Plain text, for readers that show a summary */
  summary?: string
  /** The post as HTML, already sanitized; links and images made absolute here */
  html?: string
  tags?: string[]
}

export interface Feed {
  title: string
  /** The page the feed belongs to */
  link: string
  /** Where this feed itself lives (atom:link rel="self") */
  selfUrl: string
  description: string
  items: FeedItem[]
}

// Characters XML 1.0 doesn't allow at all, even escaped
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

export function escapeXml(text: string): string {
  return text
    .replace(NOT_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cdata(html: string): string {
  return `<![CDATA[${html.replace(NOT_XML, '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/** `src="/x"` and `href="/x"` point at the site, so readers elsewhere can follow them. */
export function absolutizeUrls(html: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return html.replace(/\b(src|href)=(["'])\/(?!\/)/g, `$1=$2${base}/`)
}

/** The newest item's date, or now for an empty feed (for Last-Modified). */
export function lastModified(feed: Feed): Date {
  return new Date(feed.items.length ? Math.max(...feed.items.map((item) => item.publishedAt.getTime())) : Date.now())
}

export function renderRss(feed: Feed, baseUrl: string): string {
  const items = feed.items
    .map((item) => {
      const parts = [
        `<title>${escapeXml(item.title)}</title>`,
        `<link>${escapeXml(item.url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
        `<pubDate>${item.publishedAt.toUTCString()}</pubDate>`,
      ]
      if (item.author) parts.push(`<dc:creator>${escapeXml(item.author)}</dc:creator>`)
      if (item.summary) parts.push(`<description>${escapeXml(item.summary)}</description>`)
      if (item.html) parts.push(`<content:encoded>${cdata(absolutizeUrls(item.html, baseUrl))}</content:encoded>`)
      for (const tag of item.tags ?? []) parts.push(`<category>${escapeXml(tag)}</category>`)
      return `<item>${parts.join('')}</item>`
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml(feed.title)}</title>`,
    `<link>${escapeXml(feed.link)}</link>`,
    `<description>${escapeXml(feed.description)}</description>`,
    `<atom:link href="${escapeXml(feed.selfUrl)}" rel="self" type="application/rss+xml"/>`,
    `<lastBuildDate>${lastModified(feed).toUTCString()}</lastBuildDate>`,
    '<generator>HomePageAgain</generator>',
    items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}
