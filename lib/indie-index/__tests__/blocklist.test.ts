import { DEFAULT_BLOCKED_SITES, blockedDomainOf, isPlatformProfile } from '../blocklist'
import { isBlockedHost } from '../site-key'

const baseline = new Set(DEFAULT_BLOCKED_SITES.map((b) => b.domain))

describe('the built-in blocklist', () => {
  it('blocks big platforms and their subdomains', () => {
    for (const host of ['instagram.com', 'www.youtube.com', 'm.youtube.com', 'github.com', 'gist.github.com', 'en.wikipedia.org', 'linktr.ee']) {
      expect(isBlockedHost(host, baseline)).toBe(true)
    }
  })

  it('blocks tumblr.com itself but not the people on it', () => {
    expect(isBlockedHost('tumblr.com', baseline)).toBe(true)
    expect(isBlockedHost('www.tumblr.com', baseline)).toBe(true)
    expect(isBlockedHost('ada.tumblr.com', baseline)).toBe(false)
  })

  it('leaves personal hosting alone', () => {
    for (const host of ['ada.neocities.org', 'ada.github.io', 'ada.bearblog.dev', 'tilde.club', 'jvns.ca']) {
      expect(isBlockedHost(host, baseline)).toBe(false)
    }
  })
})

describe('isPlatformProfile', () => {
  it.each([
    ['https://mastodon.social/@ada', true],
    ['https://hachyderm.io/@ada/', true],
    ['https://medium.com/@ada/some-post', true],
    ['https://ada.example.org/', false],
    ['https://ada.example.org/blog/@mentions', false],
    ['https://tilde.club/~ada/', false],
    ['not a url', false],
  ])('%s → %s', (url, expected) => {
    expect(isPlatformProfile(url)).toBe(expected)
  })
})

describe('blockedDomainOf', () => {
  test.each([
    ['example.com', 'example.com'],
    ['WWW.Example.COM', 'example.com'],
    ['https://www.example.com/some/page?x=1', 'example.com'],
    ['http://spam.example.org:8080', 'spam.example.org'],
    ['example.com.', 'example.com'],
  ])('%s blocks %s', (text, domain) => {
    expect(blockedDomainOf(text)).toBe(domain)
  })

  test.each(['localhost', 'not a site', 'https://', ''])('%p is not a site', (text) => {
    expect(blockedDomainOf(text)).toBeNull()
  })

  test("a pasted address blocks the site it's on", () => {
    expect(isBlockedHost('www.example.com', new Set([blockedDomainOf('https://www.example.com/page')!]))).toBe(true)
  })
})
