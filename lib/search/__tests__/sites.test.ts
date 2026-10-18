import { cleanText, domainOf, isWebUrl, onePerDomain, toSiteResults } from '../sites'

describe('domainOf', () => {
  it('drops www. and lowercases', () => {
    expect(domainOf('https://WWW.Example.com/a/b')).toBe('example.com')
    expect(domainOf('http://blog.example.com')).toBe('blog.example.com')
  })

  it('is empty for a URL that does not parse', () => {
    expect(domainOf('not a url')).toBe('')
  })
})

describe('isWebUrl', () => {
  it('allows only http(s)', () => {
    expect(isWebUrl('https://a.b')).toBe(true)
    expect(isWebUrl('http://a.b')).toBe(true)
    expect(isWebUrl('javascript:alert(1)')).toBe(false)
    expect(isWebUrl('data:text/html,hi')).toBe(false)
    expect(isWebUrl('/relative')).toBe(false)
  })
})

describe('onePerDomain', () => {
  it('keeps the first result for each domain, in order', () => {
    const rows = [
      { url: 'https://jvns.ca/blog/1' },
      { url: 'https://example.org/' },
      { url: 'https://www.jvns.ca/blog/2' },
      { url: 'https://jvns.ca/' },
      { url: 'https://sub.jvns.ca/' },
    ]
    expect(onePerDomain(rows).map((r) => r.url)).toEqual([
      'https://jvns.ca/blog/1',
      'https://example.org/',
      'https://sub.jvns.ca/',
    ])
  })
})

describe('cleanText', () => {
  it('decodes entities and strips tags', () => {
    expect(cleanText('Tom&#39;s <b>blog</b> &amp; notes&nbsp;here')).toBe("Tom's blog & notes here")
    expect(cleanText('&#x1F600; ok')).toBe('😀 ok')
  })

  it('leaves unknown entities alone and handles empty input', () => {
    expect(cleanText('a &bogus; b')).toBe('a &bogus; b')
    expect(cleanText(null)).toBe('')
    expect(cleanText(undefined)).toBe('')
  })
})

describe('toSiteResults', () => {
  it('normalises engine and index rows', () => {
    const out = toSiteResults([
      { url: 'https://melonking.net/a', title: 'Melon&#39;s <i>site</i>', snippet: 'Hi  there' },
      { url: 'https://melonking.net/b', title: 'Second page' },
      { url: 'javascript:alert(1)', title: 'nope' },
      { url: 'https://example.com', title: '', description: 'From the index' },
    ])
    expect(out).toEqual([
      { url: 'https://melonking.net/a', domain: 'melonking.net', title: "Melon's site", snippet: 'Hi there' },
      { url: 'https://example.com', domain: 'example.com', title: 'example.com', snippet: 'From the index' },
    ])
  })
})
