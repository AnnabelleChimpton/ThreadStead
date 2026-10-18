import { isBlockedHost, isOptedOut, siteRefOf } from '../site-key'

describe('siteRefOf', () => {
  it('keys a site by its host without www., and points at the homepage', () => {
    expect(siteRefOf('https://www.Jvns.ca/blog/2024/post/?x=1#top')).toEqual({
      key: 'jvns.ca',
      host: 'jvns.ca',
      url: 'https://www.jvns.ca/',
    })
    expect(siteRefOf('http://melonking.net')).toEqual({ key: 'melonking.net', host: 'melonking.net', url: 'http://melonking.net/' })
  })

  it('keeps each person on a tilde server apart', () => {
    expect(siteRefOf('https://tilde.club/~Anna/notes.html')).toEqual({
      key: 'tilde.club/~anna',
      host: 'tilde.club',
      url: 'https://tilde.club/~anna/',
    })
    expect(siteRefOf('https://tilde.club/~bo')?.key).toBe('tilde.club/~bo')
    expect(siteRefOf('https://write.as/Matt/some-post')?.key).toBe('write.as/matt')
    expect(siteRefOf('https://write.as/')?.key).toBe('write.as')
    // A tilde that isn't the first path segment is just a page.
    expect(siteRefOf('https://example.com/people/~anna')?.key).toBe('example.com')
  })

  it('keeps a non-default port', () => {
    expect(siteRefOf('http://example.org:8080/a')).toEqual({
      key: 'example.org:8080',
      host: 'example.org:8080',
      url: 'http://example.org:8080/',
    })
    expect(siteRefOf('https://example.org:443/')?.key).toBe('example.org')
  })

  it.each([
    ['empty', ''],
    ['null', null],
    ['not a url', 'jvns.ca'],
    ['mailto', 'mailto:a@b.com'],
    ['javascript', 'javascript:alert(1)'],
    ['ftp', 'ftp://example.com/'],
    ['localhost', 'http://localhost:3000/'],
    ['single label', 'http://intranet/'],
    ['ipv4', 'http://127.0.0.1/'],
    ['ipv6', 'http://[::1]/'],
    ['.local', 'http://printer.local/'],
    ['.test', 'https://ring.test/'],
  ])('rejects %s', (_label, raw) => {
    expect(siteRefOf(raw)).toBeNull()
  })

  it('handles a trailing-dot host and international names', () => {
    expect(siteRefOf('https://example.com./')?.key).toBe('example.com')
    expect(siteRefOf('https://bücher.de/')?.key).toBe('xn--bcher-kva.de')
  })
})

describe('isBlockedHost', () => {
  const blocked = new Set(['youtube.com', 'x.com', 'medium.com'])

  it('matches the domain and its subdomains', () => {
    expect(isBlockedHost('youtube.com', blocked)).toBe(true)
    expect(isBlockedHost('m.youtube.com', blocked)).toBe(true)
    expect(isBlockedHost('www.x.com', blocked)).toBe(true)
    expect(isBlockedHost('someone.medium.com:443', blocked)).toBe(true)
  })

  it("doesn't match look-alikes", () => {
    expect(isBlockedHost('notyoutube.com', blocked)).toBe(false)
    expect(isBlockedHost('x.com.example.org', blocked)).toBe(false)
    expect(isBlockedHost('com', blocked)).toBe(false)
    expect(isBlockedHost('jvns.ca', blocked)).toBe(false)
  })
})

describe('isOptedOut', () => {
  it('covers the key itself or the whole host', () => {
    const ref = { key: 'tilde.club/~anna', host: 'tilde.club' }
    expect(isOptedOut(ref, new Set(['tilde.club/~anna']))).toBe(true)
    expect(isOptedOut(ref, new Set(['tilde.club']))).toBe(true)
    expect(isOptedOut(ref, new Set(['tilde.club/~bo']))).toBe(false)
  })
})
