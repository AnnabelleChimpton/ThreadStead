/**
 * @jest-environment node
 *
 * Sending webmentions: endpoint discovery (the cases from the spec's test
 * suite that matter), which links are told, and which posts send at all.
 */
import type { Fetcher, FetchResponse } from '@/lib/indie-index/http'
import { createGate } from '../gate'
import { findEndpoint, isPostableEndpoint, isPublicBase, linksToTell, sendWebmention, tellLinkedSites, type FormPoster } from '../send'

const BASE = 'https://homepageagain.com'
const PAGE = 'https://jane.example/notes/1'

function page(body: string, { link, url = PAGE, status = 200 }: { link?: string; url?: string; status?: number } = {}): FetchResponse {
  const headers = new Headers({ 'content-type': 'text/html' })
  if (link) headers.set('link', link)
  return { status, url, headers, body }
}

describe('findEndpoint', () => {
  it('prefers the Link header, absolute or relative', () => {
    expect(findEndpoint(page('<link rel="webmention" href="/html">', { link: '<https://wm.example/e>; rel="webmention"' }))).toBe('https://wm.example/e')
    expect(findEndpoint(page('', { link: '</wm?x=1>; rel=webmention' }))).toBe('https://jane.example/wm?x=1')
  })

  it('reads a rel list and skips other Link values', () => {
    expect(findEndpoint(page('', { link: '<https://a.example/>; rel="other", <https://wm.example/e>; rel="webmention somethingelse"' }))).toBe(
      'https://wm.example/e'
    )
  })

  it('falls back to the first <link> or <a> in the HTML, in document order', () => {
    expect(findEndpoint(page('<a rel="webmention" href="/first">x</a><link rel="webmention" href="/second">'))).toBe('https://jane.example/first')
    expect(findEndpoint(page('<link rel="stylesheet" href="/s.css"><link href="/e" rel="WebMention">'))).toBe('https://jane.example/e')
  })

  it('resolves against where the page ended up', () => {
    expect(findEndpoint(page('<link rel="webmention" href="e">', { url: 'https://jane.example/blog/post' }))).toBe('https://jane.example/blog/e')
  })

  it('takes an empty href as the page itself', () => {
    expect(findEndpoint(page('<link rel="webmention" href="">'))).toBe(PAGE)
  })

  it('ignores endpoints in comments and scripts', () => {
    expect(findEndpoint(page('<!-- <link rel="webmention" href="/no"> --><script>"<link rel=webmention href=/no>"</script>'))).toBeNull()
  })

  it('is null without one', () => {
    expect(findEndpoint(page('<a href="/about">about</a>'))).toBeNull()
  })
})

describe('linksToTell', () => {
  const blocked = new Set(['bsky.app', 'google.com'])
  const SOURCE = `${BASE}/resident/alice/post/p1`

  it('keeps outside links once each and skips this site, residents and big platforms', () => {
    const html = [
      '<a href="https://jane.example/notes/1">a</a>',
      '<a href="https://jane.example/notes/1#top">same</a>',
      `<a href="${BASE}/resident/bob">bob</a>`,
      '<a href="https://bob.homepageagain.com/">bob too</a>',
      '<a href="/resident/carol">relative</a>',
      '<a href="https://bsky.app/profile/x">bluesky</a>',
      '<a href="https://docs.google.com/x">docs</a>',
      '<a href="mailto:a@b.example">mail</a>',
      '<a href="https://tiny.example/">b</a>',
    ].join('')
    expect(linksToTell(html, SOURCE, { baseUrl: BASE, blocked })).toEqual(['https://jane.example/notes/1', 'https://tiny.example/'])
  })
})

describe('isPostableEndpoint', () => {
  const SOURCE = `${BASE}/resident/alice/post/p1`

  it('takes a host name on the usual port', () => {
    expect(isPostableEndpoint('https://webmention.io/jane/webmention', SOURCE)).toBe(true)
    expect(isPostableEndpoint('http://jane.example/wm?x=1', SOURCE)).toBe(true)
    expect(isPostableEndpoint('https://jane.example:443/wm', SOURCE)).toBe(true)
  })

  it.each([
    ['another port', 'http://rebind.example:3000/api/x'],
    ['an IPv4 address', 'http://203.0.113.9/wm'],
    ['an IPv6 address', 'http://[2001:db8::1]/wm'],
    ['this site', `${BASE}/api/auth/logout`],
    ['this site with a trailing dot', 'https://homepageagain.com./api/x'],
    ["a resident's address", 'https://bob.homepageagain.com/x'],
    ['not a URL', 'nope'],
  ])('refuses %s', (_name, endpoint) => {
    expect(isPostableEndpoint(endpoint, SOURCE)).toBe(false)
  })
})

describe('sendWebmention', () => {
  const SOURCE = `${BASE}/resident/alice/post/p1`
  const fetcherFor =
    (res: FetchResponse): Fetcher =>
    async () =>
      res

  it('posts source and target to the endpoint it finds', async () => {
    const calls: Array<[string, Record<string, string>]> = []
    const poster: FormPoster = async (url, form) => {
      calls.push([url, form])
      return 202
    }
    await expect(sendWebmention(fetcherFor(page('<link rel="webmention" href="/wm">')), poster, SOURCE, PAGE)).resolves.toBe('sent')
    expect(calls).toEqual([['https://jane.example/wm', { source: SOURCE, target: PAGE }]])
  })

  it('reports pages without an endpoint, and gone pages, without posting', async () => {
    const poster = jest.fn<Promise<number>, Parameters<FormPoster>>()
    await expect(sendWebmention(fetcherFor(page('<p>hi</p>')), poster, SOURCE, PAGE)).resolves.toBe('no_endpoint')
    await expect(sendWebmention(fetcherFor(page('', { status: 404 })), poster, SOURCE, PAGE)).resolves.toBe('no_endpoint')
    expect(poster).not.toHaveBeenCalled()
  })

  it('never posts back into this site, whatever the page advertises', async () => {
    const poster = jest.fn<Promise<number>, Parameters<FormPoster>>()
    for (const endpoint of [`${BASE}/api/auth/logout`, 'https://alice.homepageagain.com/x', 'https://www.homepageagain.com/x']) {
      await expect(sendWebmention(fetcherFor(page(`<link rel="webmention" href="${endpoint}">`)), poster, SOURCE, PAGE)).resolves.toBe('no_endpoint')
    }
    expect(poster).not.toHaveBeenCalled()
  })

  it('is failed (not thrown) when the endpoint refuses or the network breaks', async () => {
    const found = fetcherFor(page('<link rel="webmention" href="/wm">'))
    await expect(sendWebmention(found, async () => 400, SOURCE, PAGE)).resolves.toBe('failed')
    await expect(
      sendWebmention(
        found,
        async () => {
          throw new Error('private address')
        },
        SOURCE,
        PAGE
      )
    ).resolves.toBe('failed')
  })
})

describe('tellLinkedSites', () => {
  type Row = {
    bodyHtml: string | null
    visibility: string
    contentWarning: string | null
    isSpoiler: boolean
    author: {
      primaryHandle: string | null
      moderationStatus: string
      suspendedUntil: Date | null
      deletesAt: Date | null
      profile: { visibility: string; sendWebmentions: boolean } | null
    }
  }
  const row = (overrides: Partial<Omit<Row, 'author'>> & { author?: Partial<Row['author']> } = {}): Row => {
    const { author, ...rest } = overrides
    return {
      bodyHtml: '<a href="https://jane.example/notes/1">Jane</a>',
      visibility: 'public',
      contentWarning: null,
      isSpoiler: false,
      ...rest,
      author: {
        primaryHandle: 'alice@homepageagain',
        moderationStatus: 'active',
        suspendedUntil: null,
        deletesAt: null,
        profile: { visibility: 'public', sendWebmentions: true },
        ...author,
      },
    }
  }
  const dbWith = (post: Row | null) =>
    ({ post: { findUnique: async () => post }, blockedSite: { findMany: async () => [] } }) as never

  const endpointEverywhere: Fetcher = async ({ url }) => page('<link rel="webmention" href="/wm">', { url })

  function poster() {
    const sent: Array<Record<string, string>> = []
    const post: FormPoster = async (_url, form) => {
      sent.push(form)
      return 202
    }
    return { post, sent }
  }

  it('tells the linked sites, with the post page as the source', async () => {
    const { post, sent } = poster()
    await expect(tellLinkedSites(dbWith(row()), 'p1', { fetcher: endpointEverywhere, post, baseUrl: BASE })).resolves.toEqual({
      'https://jane.example/notes/1': 'sent',
    })
    expect(sent).toEqual([{ source: `${BASE}/resident/alice/post/p1`, target: 'https://jane.example/notes/1' }])
  })

  it('tells links an edit removed, so they can drop it', async () => {
    const { post, sent } = poster()
    await tellLinkedSites(dbWith(row()), 'p1', {
      fetcher: endpointEverywhere,
      post,
      baseUrl: BASE,
      previousHtml: '<a href="https://old.example/">gone now</a>',
    })
    expect(sent.map((s) => s.target)).toEqual(['https://jane.example/notes/1', 'https://old.example/'])
  })

  it.each([
    ['a post that is not public', row({ visibility: 'followers' })],
    ['a post with a content warning', row({ contentWarning: 'spoilers for the finale' })],
    ['a spoiler post', row({ isSpoiler: true })],
    ['a post on a private profile', row({ author: { profile: { visibility: 'private', sendWebmentions: true } } })],
    ['a resident who turned it off', row({ author: { profile: { visibility: 'public', sendWebmentions: false } } })],
    ['a suspended resident', row({ author: { moderationStatus: 'suspended' } })],
    ['a resident who is leaving', row({ author: { deletesAt: new Date() } })],
    ['a post that is gone', null],
  ])('sends nothing for %s', async (_name, r) => {
    const { post, sent } = poster()
    await expect(tellLinkedSites(dbWith(r), 'p1', { fetcher: endpointEverywhere, post, baseUrl: BASE })).resolves.toEqual({})
    expect(sent).toEqual([])
  })
})

describe('isPublicBase', () => {
  it('is false where outside sites could never fetch the post', () => {
    expect(isPublicBase('https://homepageagain.com')).toBe(true)
    expect(isPublicBase('http://localhost:3000')).toBe(false)
    expect(isPublicBase('http://homepageagain.localhost:3120')).toBe(false)
    expect(isPublicBase('http://127.0.0.1:3000')).toBe(false)
  })
})

describe('createGate', () => {
  it('runs a few at a time and refuses once the line is full', async () => {
    const gate = createGate(1, 1)
    const release: Array<() => void> = []
    const task = () => new Promise<void>((resolve) => release.push(resolve))
    expect(gate.tryRun(task)).toBe(true) // running
    expect(gate.tryRun(task)).toBe(true) // waiting
    expect(gate.tryRun(task)).toBe(false) // line full
    expect(release).toHaveLength(1)
    release[0]()
    await new Promise((r) => setTimeout(r, 0))
    expect(release).toHaveLength(2) // the waiting one started
  })
})
