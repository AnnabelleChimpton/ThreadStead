/**
 * @jest-environment node
 */
import { absolutizeUrls, escapeXml, lastModified, renderRss, type Feed } from '@/lib/feeds/rss'
import { postFeedItem, type FeedPost } from '@/lib/feeds/post-content'

const BASE = 'https://homepageagain.com'

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 'p1',
    title: 'Hello & welcome',
    createdAt: new Date('2026-10-20T12:00:00Z'),
    bodyHtml: null,
    bodyMarkdown: 'Some **bold** words and ![a cat](/api/media/serve/cat)',
    bodyText: null,
    excerpt: null,
    textPreview: 'Some bold words',
    tags: ['cats'],
    contentWarning: null,
    isSpoiler: false,
    ...overrides,
  }
}

function feed(items: Feed['items']): Feed {
  return {
    title: 'Alice <3 on HomePageAgain',
    link: `${BASE}/resident/alice`,
    selfUrl: `${BASE}/resident/alice/feed.xml`,
    description: 'Knitting & cats',
    items,
  }
}

describe('escapeXml', () => {
  it('escapes markup and drops characters XML can never hold', () => {
    expect(escapeXml(`a & b < c > "d" 'e'\u0007`)).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;')
  })
})

describe('absolutizeUrls', () => {
  it('points site-relative links and images at the site, leaving the rest alone', () => {
    const html = `<a href="/resident/bob">Bob</a><img src='/api/media/serve/x'><a href="//cdn.example/x">c</a><a href="https://elsewhere.example/">e</a>`
    expect(absolutizeUrls(html, `${BASE}/`)).toBe(
      `<a href="${BASE}/resident/bob">Bob</a><img src='${BASE}/api/media/serve/x'><a href="//cdn.example/x">c</a><a href="https://elsewhere.example/">e</a>`
    )
  })
})

describe('renderRss', () => {
  it('writes a valid channel with the post in content:encoded', () => {
    const item = postFeedItem(post(), `${BASE}/resident/alice/post/p1`, 'Alice')
    const xml = renderRss(feed([item]), BASE)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<title>Alice &lt;3 on HomePageAgain</title>')
    expect(xml).toContain(`<atom:link href="${BASE}/resident/alice/feed.xml" rel="self" type="application/rss+xml"/>`)
    expect(xml).toContain('<title>Hello &amp; welcome</title>')
    expect(xml).toContain(`<guid isPermaLink="true">${BASE}/resident/alice/post/p1</guid>`)
    expect(xml).toContain('<pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate>')
    expect(xml).toContain('<dc:creator>Alice</dc:creator>')
    expect(xml).toContain('<category>cats</category>')
    expect(xml).toMatch(/<content:encoded><!\[CDATA\[.*<strong>bold<\/strong>.*\]\]><\/content:encoded>/s)
    expect(xml).toContain(`src="${BASE}/api/media/serve/cat"`)
  })

  it('keeps a "]]>" in a post from closing the CDATA early', () => {
    const item = { title: 't', url: `${BASE}/p`, publishedAt: new Date(0), html: '<p>a ]]> b</p>' }
    const xml = renderRss(feed([item]), BASE)
    expect(xml).toContain('a ]]]]><![CDATA[> b')
  })
})

describe('postFeedItem', () => {
  it('carries only the warning and a link for a post behind a content warning', () => {
    const item = postFeedItem(post({ contentWarning: 'scary story' }), `${BASE}/p`, 'Alice')
    expect(item.summary).toBe('Content warning: scary story')
    expect(item.html).not.toContain('bold')
    expect(item.html).toContain(`<a href="${BASE}/p">Read it on HomePageAgain</a>`)
  })

  it('treats a spoiler without its own warning as one', () => {
    const item = postFeedItem(post({ isSpoiler: true }), `${BASE}/p`)
    expect(item.summary).toBe('Content warning: Spoilers')
    expect(item.html).not.toContain('bold')
  })

  it('turns plain text into escaped paragraphs', () => {
    const item = postFeedItem(post({ bodyMarkdown: null, bodyText: 'one <b>\ntwo\n\nthree' }), `${BASE}/p`)
    expect(item.html).toBe('<p>one &lt;b&gt;<br>two</p><p>three</p>')
  })
})

describe('lastModified', () => {
  it('is the newest item date', () => {
    const older = postFeedItem(post({ createdAt: new Date('2026-01-01T00:00:00Z') }), `${BASE}/a`)
    const newer = postFeedItem(post({ createdAt: new Date('2026-05-01T00:00:00Z') }), `${BASE}/b`)
    expect(lastModified(feed([older, newer])).toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })
})
