import { cleanText, domainOf, isWebUrl } from '../sites'

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
