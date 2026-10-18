import { attributesOf, extractBareUrls, extractHead, extractLinks, extractRelMe, headerSaysNoindex } from '../html'
import { parseRobots, robotsPath } from '../robots'
import { excerptOf, parseFeed, siteNameFromFeedTitle } from '../feed'

// ------------------------------------------------------------------ html --

describe('extractLinks', () => {
  const base = 'https://ada.example.org/links/'

  it('finds links in hand-written HTML, resolves them, and skips non-web ones', () => {
    const html = `
      <A HREF="https://jvns.ca/">Julia</A>
      <a href='/about'>me</a>
      <a href=../friends.html>friends</a>
      <a href="mailto:a@b.c">mail</a><a href="javascript:void(0)">x</a><a href="#top">top</a>
      <a name="anchor">no href</a>
      <a href="https://unclosed.example.org/">never closed
      <a href="https://after.example.org/#frag">after</a>`
    expect(extractLinks(html, base).map((l) => l.href)).toEqual([
      'https://jvns.ca/',
      'https://ada.example.org/about',
      'https://ada.example.org/friends.html',
      'https://unclosed.example.org/',
      'https://after.example.org/',
    ])
  })

  it('ignores links inside comments, scripts and styles', () => {
    const html = `<!-- <a href="https://hidden.example.org/">x</a> -->
      <script>document.write('<a href="https://script.example.org/">x</a>')</script>
      <style>a[href="https://style.example.org/"]{}</style>
      <a href="https://shown.example.org/">ok</a>`
    expect(extractLinks(html, base).map((l) => l.href)).toEqual(['https://shown.example.org/'])
  })

  it('spots 88×31 buttons by size attributes, style or file name', () => {
    const html = `
      <a href="https://one.example.org/"><img src="/b/one.gif" width="88" height="31" alt="one"></a>
      <a href="https://two.example.org/"><img src="two.png" style="width: 88px; height: 31px"></a>
      <a href="https://three.example.org/"><img src="/buttons/three-88x31.gif"></a>
      <a href="https://photo.example.org/"><img src="cat.jpg" width="400" height="300"></a>
      <a href="https://text.example.org/">just text</a>`
    expect(extractLinks(html, base).map((l) => [l.href, l.button?.src ?? null])).toEqual([
      ['https://one.example.org/', 'https://ada.example.org/b/one.gif'],
      ['https://two.example.org/', 'https://ada.example.org/links/two.png'],
      ['https://three.example.org/', 'https://ada.example.org/buttons/three-88x31.gif'],
      ['https://photo.example.org/', null],
      ['https://text.example.org/', null],
    ])
  })

  it('honours <base href> and reads rel', () => {
    const html = `<base href="https://cdn.example.org/site/"><a href="page" rel="me noopener">x</a>`
    expect(extractLinks(html, base)).toEqual([{ href: 'https://cdn.example.org/site/page', rel: ['me', 'noopener'] }])
  })

  it('decodes entities in attributes', () => {
    expect(attributesOf('<a href="https://a.example.org/?x=1&amp;y=2" title=\'it&#39;s\' data-x=bare>')).toEqual({
      href: 'https://a.example.org/?x=1&y=2',
      title: "it's",
      'data-x': 'bare',
    })
  })
})

describe('extractRelMe and extractBareUrls', () => {
  it('collects rel=me from <a> and <link>', () => {
    const html = `<link rel="me" href="https://homepageagain.com/resident/ada"><a rel="nofollow me" href="https://social.example/@ada">m</a><a href="https://other.example.org/">no</a>`
    expect(extractRelMe(html, 'https://ada.example.org/')).toEqual([
      'https://homepageagain.com/resident/ada',
      'https://social.example/@ada',
    ])
  })

  it('finds bare URLs in a bio without trailing punctuation', () => {
    expect(extractBareUrls('My site: https://ada.example.org/blog. Also (https://bo.example.org)!')).toEqual([
      'https://ada.example.org/blog',
      'https://bo.example.org',
    ])
  })
})

describe('extractHead', () => {
  const base = 'https://ada.example.org/'

  it('reads title, description and feed links', () => {
    const html = `<!doctype html><html><head>
      <title> Ada&#39;s   corner </title>
      <meta name="description" content="Notes &amp; zines">
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="RSS">
      <link rel="alternate" type="application/atom+xml" href="https://ada.example.org/atom.xml">
      <link rel="alternate" type="application/json" href="/wp-json/wp/v2/pages/1">
      <link rel="alternate" type="application/feed+json" href="/feed.json">
      <link rel="alternate" hreflang="fr" href="/fr/">
      </head><body><title>not this</title></body></html>`
    expect(extractHead(html, base)).toEqual({
      title: "Ada's corner",
      description: 'Notes & zines',
      noindex: false,
      feeds: ['https://ada.example.org/feed.xml', 'https://ada.example.org/atom.xml', 'https://ada.example.org/feed.json'],
    })
  })

  it('falls back to og: tags', () => {
    const html = `<head><meta property="og:title" content="OG title"><meta property="og:description" content="OG desc"></head>`
    expect(extractHead(html, base)).toMatchObject({ title: 'OG title', description: 'OG desc' })
  })

  it.each([
    ['<meta name="robots" content="noindex, follow">', true],
    ['<meta name="ROBOTS" content="none">', true],
    ['<meta name="threadsteadbot" content="noindex">', true],
    ['<meta name="googlebot" content="noindex">', false],
    ['<meta name="robots" content="index, follow">', false],
  ])('noindex from %s → %s', (tag, expected) => {
    expect(extractHead(`<head>${tag}</head>`, base).noindex).toBe(expected)
  })

  it.each([
    ['noindex', true],
    ['noindex, nofollow', true],
    ['none', true],
    ['threadsteadbot: noindex', true],
    ['googlebot: noindex', false],
    ['max-snippet: 20, noindex', true],
    ['nofollow', false],
    [null, false],
  ])('X-Robots-Tag %s → %s', (value, expected) => {
    expect(headerSaysNoindex(value)).toBe(expected)
  })
})

// ---------------------------------------------------------------- robots --

describe('parseRobots', () => {
  it('allows everything with no file content, an empty Disallow, or no matching group', () => {
    expect(parseRobots('').allows('/')).toBe(true)
    expect(parseRobots('User-agent: *\nDisallow:').allows('/feed.xml')).toBe(true)
    expect(parseRobots('User-agent: Googlebot\nDisallow: /').allows('/')).toBe(true)
  })

  it('Disallow: / for everyone blocks everything but robots.txt itself', () => {
    const r = parseRobots('User-agent: *\nDisallow: /')
    expect(r.allows('/')).toBe(false)
    expect(r.allows('/feed.xml')).toBe(false)
    expect(r.allows('/robots.txt')).toBe(true)
  })

  it('our named group wins over *, matched case-insensitively and with a version', () => {
    const text = `User-agent: *\nDisallow: /\n\nUser-agent: ThreadsteadBot/2.0\nAllow: /`
    expect(parseRobots(text).allows('/feed.xml')).toBe(true)
    const blocked = `User-agent: *\nAllow: /\n\nUser-agent: threadsteadbot\nDisallow: /`
    expect(parseRobots(blocked).allows('/')).toBe(false)
  })

  it("doesn't treat another bot's group as ours because its name is a substring", () => {
    expect(parseRobots('User-agent: bot\nDisallow: /').allows('/')).toBe(true)
  })

  it('merges consecutive user-agent lines into one group', () => {
    const r = parseRobots('User-agent: GPTBot\nUser-agent: ThreadsteadBot\nDisallow: /private\n\nUser-agent: *\nDisallow: /')
    expect(r.allows('/')).toBe(true)
    expect(r.allows('/private/x')).toBe(false)
  })

  it('longest match wins, Allow wins ties, * and $ work', () => {
    const r = parseRobots(`User-agent: *
Disallow: /blog
Allow: /blog/feed
Disallow: /*.pdf$
Allow: /same
Disallow: /same
# comment
Disallow: /q?private`)
    expect(r.allows('/blog/post')).toBe(false)
    expect(r.allows('/blog/feed.xml')).toBe(true)
    expect(r.allows('/files/a.pdf')).toBe(false)
    expect(r.allows('/files/a.pdf.html')).toBe(true)
    expect(r.allows('/same')).toBe(true)
    expect(r.allows('/q?private=1')).toBe(false)
    expect(r.allows('/')).toBe(true)
  })

  it('compares percent-encoded paths decoded', () => {
    expect(parseRobots('User-agent: *\nDisallow: /caf%C3%A9').allows('/café/menu')).toBe(false)
  })

  it('robotsPath keeps the query', () => {
    expect(robotsPath('https://a.example.org/x/y?z=1#h')).toBe('/x/y?z=1')
    expect(robotsPath('https://a.example.org')).toBe('/')
  })
})

// ------------------------------------------------------------------ feed --

describe('parseFeed', () => {
  const base = 'https://ada.example.org/feed.xml'

  it('reads RSS 2.0 with HTML descriptions, CDATA content and guids', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Ada &amp; friends</title>
        <link>https://ada.example.org/</link>
        <atom:link href="https://ada.example.org/feed.xml" rel="self"/>
        <description>Notes</description>
        <item>
          <title>Knitting &lt;b&gt;socks&lt;/b&gt;</title>
          <link>/2026/socks</link>
          <description>&lt;p&gt;Short&amp;nbsp;bit&lt;/p&gt;</description>
          <content:encoded><![CDATA[<p>The <em>whole</em> post about socks.</p><script>x()</script>]]></content:encoded>
          <pubDate>Tue, 14 Oct 2026 09:30:00 +0000</pubDate>
        </item>
        <item>
          <title>Only a guid</title>
          <guid isPermaLink="true">https://ada.example.org/guid-post</guid>
          <description>Plain</description>
        </item>
        <item><title>No link at all</title><guid isPermaLink="false">tag:x</guid></item>
      </channel></rss>`
    expect(parseFeed(xml, base)).toEqual({
      title: 'Ada & friends',
      siteUrl: 'https://ada.example.org/',
      description: 'Notes',
      items: [
        {
          url: 'https://ada.example.org/2026/socks',
          title: 'Knitting socks',
          text: 'The whole post about socks.',
          publishedAt: new Date('2026-10-14T09:30:00Z'),
        },
        { url: 'https://ada.example.org/guid-post', title: 'Only a guid', text: 'Plain', publishedAt: null },
      ],
    })
  })

  it('reads Atom with xhtml content, relative links against xml:base, and rel=alternate', () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xml:base="https://bo.example.org/blog/">
        <title type="html">Bo&apos;s log</title>
        <subtitle>Things</subtitle>
        <link rel="self" href="https://bo.example.org/atom.xml"/>
        <link href="https://bo.example.org/"/>
        <entry>
          <title>First</title>
          <link rel="edit" href="https://bo.example.org/edit/1"/>
          <link rel="alternate" type="text/html" href="first"/>
          <id>tag:bo,2026:1</id>
          <updated>2026-10-01T00:00:00Z</updated>
          <published>2026-09-30T12:00:00+02:00</published>
          <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Hello <b>there</b>.</p><p>Second para.</p></div></content>
        </entry>
        <entry>
          <title>By id</title>
          <id>https://bo.example.org/blog/by-id</id>
          <summary>Sum</summary>
        </entry>
      </feed>`
    const feed = parseFeed(xml, 'https://bo.example.org/atom.xml')!
    expect(feed.title).toBe("Bo's log")
    expect(feed.siteUrl).toBe('https://bo.example.org/')
    expect(feed.items).toEqual([
      { url: 'https://bo.example.org/blog/first', title: 'First', text: 'Hello there. Second para.', publishedAt: new Date('2026-09-30T10:00:00Z') },
      { url: 'https://bo.example.org/blog/by-id', title: 'By id', text: 'Sum', publishedAt: null },
    ])
  })

  it('reads RSS 1.0 (RDF)', () => {
    const xml = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <channel rdf:about="x"><title>Old school</title><link>https://old.example.org/</link></channel>
      <item rdf:about="https://old.example.org/1"><title>One</title><link>https://old.example.org/1</link><dc:date>2026-01-02T03:04:05Z</dc:date></item>
    </rdf:RDF>`
    expect(parseFeed(xml, 'https://old.example.org/index.rdf')).toMatchObject({
      title: 'Old school',
      items: [{ url: 'https://old.example.org/1', title: 'One', publishedAt: new Date('2026-01-02T03:04:05Z') }],
    })
  })

  it('reads JSON Feed', () => {
    const json = JSON.stringify({
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Cy',
      home_page_url: 'https://cy.example.org/',
      items: [
        { id: '1', url: '/one', title: 'One', content_html: '<p>Hi</p>', date_published: '2026-10-10T10:00:00Z' },
        { id: '2', content_text: 'no url' },
      ],
    })
    expect(parseFeed(json, 'https://cy.example.org/feed.json')).toEqual({
      title: 'Cy',
      siteUrl: 'https://cy.example.org/',
      description: null,
      items: [{ url: 'https://cy.example.org/one', title: 'One', text: 'Hi', publishedAt: new Date('2026-10-10T10:00:00Z') }],
    })
  })

  it('returns null for HTML, garbage, other JSON and empty bodies', () => {
    expect(parseFeed('<!doctype html><html><body>hi</body></html>', base)).toBeNull()
    expect(parseFeed('not xml', base)).toBeNull()
    expect(parseFeed('{"hello": 1}', base)).toBeNull()
    expect(parseFeed('{broken', base)).toBeNull()
    expect(parseFeed('', base)).toBeNull()
  })

  it('ignores DOCTYPE entity declarations (no billion laughs)', () => {
    const xml = `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]>
      <rss><channel><title>T &b;</title><item><title>x</title><link>https://a.example.org/x</link></item></channel></rss>`
    const feed = parseFeed(xml, base)
    expect(feed?.items).toHaveLength(1)
    expect(feed?.title ?? '').not.toContain('aaaaaaaaaa')
  })

  it('treats an unparseable date as no date', () => {
    const xml = `<rss><channel><item><link>https://a.example.org/x</link><pubDate>someday</pubDate></item></channel></rss>`
    expect(parseFeed(xml, base)?.items[0].publishedAt).toBeNull()
  })
})

describe('excerptOf', () => {
  it('keeps short text, cuts long text on a word with an ellipsis', () => {
    expect(excerptOf('  short   text ', 50)).toBe('short text')
    expect(excerptOf('', 50)).toBeNull()
    const cut = excerptOf('one two three four five six seven eight nine ten', 20)!
    expect(cut).toBe('one two three four…')
    expect(cut.length).toBeLessThanOrEqual(20)
  })
})

describe('siteNameFromFeedTitle', () => {
  it.each([
    ['Ratfactor Feed', 'ratfactor.com', 'Ratfactor'],
    ['Manuel Moreale — Everything Feed', 'manuelmoreale.com', 'Manuel Moreale'],
    ['Knitting | RSS', 'knit.example.org', 'Knitting'],
    ["Xe Iaso's blog", 'xeiaso.net', "Xe Iaso's blog"],
    ['Sunday Feed', 'sunday.example.org', 'Sunday'],
    ['Sunday Feed', 'other.example.org', 'Sunday Feed'],
    ['A feed', 'ada.example.org', 'A feed'],
    ['Feedback Loop', 'loop.example.org', 'Feedback Loop'],
    ['RSS Feed', 'x.example.org', null],
    ['', 'x.example.org', null],
    [null, 'x.example.org', null],
  ])('%s on %s → %s', (title, host, expected) => {
    expect(siteNameFromFeedTitle(title, host)).toBe(expected)
  })
})
