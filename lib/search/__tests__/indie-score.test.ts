import { addressOf, indieScore, linkScore } from '../indie'
import { ENGINES } from '@/components/features/search/SearchElsewhere'

jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

const NOW = Date.parse('2026-10-19T12:00:00Z')
const base = { siteRank: 1, itemRank: 0, trigram: 0, tier: 'community' as const, lastPostAt: null, residentSignals: 0, linkedFromSites: 0 }

describe('indieScore', () => {
  it('orders tiers resident > vouched > community > pool when text is equal', () => {
    const scores = (['resident', 'vouched', 'community', 'pool'] as const).map((tier) => indieScore({ ...base, tier }, NOW))
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('a much better text match beats a better tier', () => {
    expect(indieScore({ ...base, tier: 'pool', siteRank: 2 }, NOW)).toBeGreaterThan(indieScore({ ...base, tier: 'community', siteRank: 0.05 }, NOW))
  })

  it('counts a matching post a little below a matching site', () => {
    expect(indieScore({ ...base, siteRank: 0, itemRank: 1 }, NOW)).toBeLessThan(indieScore(base, NOW))
    expect(indieScore({ ...base, siteRank: 0, itemRank: 1 }, NOW)).toBeGreaterThan(indieScore({ ...base, siteRank: 0 }, NOW))
  })

  it('freshness and links nudge', () => {
    expect(indieScore({ ...base, lastPostAt: new Date(NOW - 86_400_000) }, NOW)).toBeGreaterThan(indieScore(base, NOW))
    expect(linkScore(0, 0)).toBe(0)
    expect(linkScore(10, 0)).toBe(1)
    expect(linkScore(50, 50)).toBe(1)
  })
})

describe('addressOf', () => {
  it('turns what people paste into a site key', () => {
    expect(addressOf('https://www.Jvns.ca/')).toBe('jvns.ca')
    expect(addressOf('  jvns.ca ')).toBe('jvns.ca')
  })
})

describe('search elsewhere links', () => {
  it('carry the query, encoded, to each engine', () => {
    const q = 'knit & purl "socks"'
    expect(ENGINES.map((e) => e.href(q))).toEqual([
      'https://marginalia-search.com/search?query=knit%20%26%20purl%20%22socks%22',
      'https://wiby.me/?q=knit%20%26%20purl%20%22socks%22',
      'https://searchmysite.net/search/?q=knit%20%26%20purl%20%22socks%22',
      'https://duckduckgo.com/?q=knit%20%26%20purl%20%22socks%22',
    ])
  })
})
