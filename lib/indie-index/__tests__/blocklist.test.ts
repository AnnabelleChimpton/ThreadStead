import { DEFAULT_BLOCKED_SITES, isPlatformProfile } from '../blocklist'
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
