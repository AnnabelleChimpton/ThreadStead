/** @jest-environment node */
import { botUserAgent, createHttpFetcher, decodeBody, FetchError, politeFetcher, type Fetcher } from '../http'

const enc = (s: string) => new TextEncoder().encode(s)

describe('decodeBody', () => {
  it('uses the header charset first', () => {
    expect(decodeBody(new Uint8Array([0x63, 0x61, 0x66, 0xe9]), 'text/html; charset=ISO-8859-1')).toBe('café')
  })

  it('then a BOM, then the XML prolog or meta charset, else UTF-8', () => {
    expect(decodeBody(new Uint8Array([0xef, 0xbb, 0xbf, ...enc('hé')]), null)).toBe('hé')
    const latin = new Uint8Array([...enc('<?xml version="1.0" encoding="windows-1252"?><t>'), 0x93, 0x68, 0x69, 0x94, ...enc('</t>')])
    expect(decodeBody(latin, 'application/xml')).toBe('<?xml version="1.0" encoding="windows-1252"?><t>“hi”</t>')
    expect(decodeBody(new Uint8Array([...enc('<meta charset="iso-8859-1">'), 0xe9]), 'text/html')).toBe('<meta charset="iso-8859-1">é')
    expect(decodeBody(enc('naïve'), null)).toBe('naïve')
  })

  it('falls back to UTF-8 for unknown labels', () => {
    expect(decodeBody(enc('ok'), 'text/plain; charset=made-up')).toBe('ok')
  })
})

describe('botUserAgent', () => {
  it('names the bot and its about page', () => {
    expect(botUserAgent('https://homepageagain.com/')).toBe('ThreadsteadBot/2.0 (+https://homepageagain.com/indie/about)')
  })
})

describe('createHttpFetcher', () => {
  const publicDns = async () => [{ address: '93.184.216.34' }]
  let fetchMock: jest.SpyInstance

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch')
  })
  afterEach(() => fetchMock.mockRestore())

  const fetcher = createHttpFetcher({ userAgent: 'TestBot', resolve: publicDns })

  it('sends the UA, Accept and conditional headers, and returns the decoded body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<rss/>', { status: 200, headers: { 'content-type': 'application/rss+xml' } }))
    const res = await fetcher({ url: 'https://a.example.org/feed', accept: 'x/y', maxBytes: 1000, etag: '"e1"', lastModified: 'Mon, 01 Jan 2026 00:00:00 GMT' })
    expect(res).toMatchObject({ status: 200, url: 'https://a.example.org/feed', body: '<rss/>' })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers).toEqual({
      'User-Agent': 'TestBot',
      Accept: 'x/y',
      'If-None-Match': '"e1"',
      'If-Modified-Since': 'Mon, 01 Jan 2026 00:00:00 GMT',
    })
    expect(init.redirect).toBe('manual')
  })

  it('follows redirects and reports the final URL; 304 comes back with no body', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: '/new-feed' } }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
    const res = await fetcher({ url: 'https://a.example.org/feed', accept: '*/*', maxBytes: 1000 })
    expect(res).toMatchObject({ status: 304, url: 'https://a.example.org/new-feed', body: '' })
  })

  it('refuses a redirect to a private address', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } }))
    await expect(fetcher({ url: 'https://a.example.org/', accept: '*/*', maxBytes: 1000 })).rejects.toThrow(FetchError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refuses a host that resolves to a private address without fetching it', async () => {
    const local = createHttpFetcher({ userAgent: 'TestBot', resolve: async () => [{ address: '10.0.0.5' }] })
    await expect(local({ url: 'https://sneaky.example.org/', accept: '*/*', maxBytes: 1000 })).rejects.toThrow('not public')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('caps the body: fails a feed, truncates a homepage', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x'.repeat(50), { status: 200 }))
    await expect(fetcher({ url: 'https://a.example.org/feed', accept: '*/*', maxBytes: 10 })).rejects.toThrow('too large')
    fetchMock.mockResolvedValueOnce(new Response('<head>' + 'x'.repeat(50), { status: 200 }))
    const res = await fetcher({ url: 'https://a.example.org/', accept: '*/*', maxBytes: 10, truncate: true })
    expect(res.body).toBe('<head>xxxx')
  })

  it('gives up after too many redirects', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: '/loop' } }))
    const short = createHttpFetcher({ userAgent: 'TestBot', resolve: publicDns, maxRedirects: 2 })
    await expect(short({ url: 'https://a.example.org/', accept: '*/*', maxBytes: 10 })).rejects.toThrow('too many redirects')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('turns network failures into FetchError', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }))
    await expect(fetcher({ url: 'https://a.example.org/', accept: '*/*', maxBytes: 10 })).rejects.toThrow('network error (ECONNREFUSED)')
  })
})

describe('politeFetcher', () => {
  it('runs one request per host at a time, gapMs apart; other hosts go in parallel', async () => {
    let clock = 0
    const log: string[] = []
    const inner: Fetcher = async (req) => {
      log.push(`${clock} ${req.url}`)
      return { status: 200, url: req.url, headers: new Headers(), body: '' }
    }
    const sleep = async (ms: number) => {
      clock += ms
    }
    const polite = politeFetcher(inner, { gapMs: 2000, now: () => clock, sleep })
    const req = (url: string) => polite({ url, accept: '*/*', maxBytes: 1 })

    await Promise.all([req('https://a.example.org/1'), req('https://a.example.org/2'), req('https://b.example.org/1'), req('https://a.example.org/3')])

    const aTimes = log.filter((l) => l.includes('a.example.org')).map((l) => Number(l.split(' ')[0]))
    expect(aTimes).toHaveLength(3)
    expect(aTimes[1] - aTimes[0]).toBeGreaterThanOrEqual(2000)
    expect(aTimes[2] - aTimes[1]).toBeGreaterThanOrEqual(2000)
    expect(log.filter((l) => l.includes('/1')).map((l) => l.split(' ')[0])).toEqual(['0', '0'])
  })

  it('keeps going after a failed request', async () => {
    const inner: Fetcher = async (req) => {
      if (req.url.endsWith('/bad')) throw new Error('boom')
      return { status: 200, url: req.url, headers: new Headers(), body: 'ok' }
    }
    const polite = politeFetcher(inner, { gapMs: 0 })
    await expect(polite({ url: 'https://a.example.org/bad', accept: '*/*', maxBytes: 1 })).rejects.toThrow('boom')
    await expect(polite({ url: 'https://a.example.org/good', accept: '*/*', maxBytes: 1 })).resolves.toMatchObject({ body: 'ok' })
  })
})
