import {
  blendScore,
  isExactName,
  normaliseTextRank,
  rankBySignals,
  recencyScore,
  ringTextRank,
  wordSimilarity,
  type RelevanceSignals,
} from '@/lib/search/relevance'

const NOW = Date.UTC(2026, 9, 17)
const DAY = 86_400_000

function signals(overrides: Partial<RelevanceSignals> = {}): RelevanceSignals {
  return {
    type: 'post',
    id: 'x',
    textRank: 0,
    trigram: 0,
    exact: false,
    activityAt: null,
    follows: false,
    sharedRing: false,
    ...overrides,
  }
}

describe('blendScore', () => {
  test('an exact match outranks any non-exact one', () => {
    const exactWeak = blendScore(signals({ exact: true }), NOW)
    const strong = blendScore(
      signals({ textRank: 50, trigram: 1, activityAt: new Date(NOW), follows: true }),
      NOW
    )
    expect(strong).toBeLessThanOrEqual(1)
    expect(exactWeak).toBeGreaterThan(strong)
  })

  test('weights: text 0.55, trigram 0.15, recency 0.15, social 0.15', () => {
    expect(blendScore(signals({ trigram: 1 }), NOW)).toBeCloseTo(0.15)
    expect(blendScore(signals({ activityAt: new Date(NOW) }), NOW)).toBeCloseTo(0.15)
    expect(blendScore(signals({ follows: true }), NOW)).toBeCloseTo(0.15)
    expect(blendScore(signals({ sharedRing: true }), NOW)).toBeCloseTo(0.075)
    expect(blendScore(signals({ textRank: 1e9 }), NOW)).toBeCloseTo(0.55)
  })

  test('a title hit beats a body hit; text saturates', () => {
    expect(normaliseTextRank(1)).toBeGreaterThan(normaliseTextRank(0.2))
    expect(normaliseTextRank(0)).toBe(0)
    expect(normaliseTextRank(100)).toBeLessThan(1)
  })

  test('recency halves every 90 days and ignores future dates', () => {
    expect(recencyScore(new Date(NOW - 90 * DAY), NOW)).toBeCloseTo(0.5)
    expect(recencyScore(new Date(NOW + DAY), NOW)).toBe(1)
    expect(recencyScore(null, NOW)).toBe(0)
  })
})

describe('rankBySignals', () => {
  test('sorts by score, ties broken by type:id', () => {
    const ranked = rankBySignals(
      [
        signals({ id: 'b', textRank: 1 }),
        signals({ id: 'a', textRank: 1 }),
        signals({ id: 'c', textRank: 5 }),
        signals({ type: 'user', id: 'z', exact: true }),
      ],
      NOW
    )
    expect(ranked.map((r) => r.key)).toEqual(['user:z', 'post:c', 'post:a', 'post:b'])
  })
})

describe('ring scoring', () => {
  test('name hits count more than description hits', () => {
    const ring = { name: 'Cozy Cats', slug: 'cozy-cats', description: 'a ring about knitting' }
    expect(ringTextRank('cats', ring)).toBe(1)
    expect(ringTextRank('knitting', ring)).toBeCloseTo(0.2)
    expect(ringTextRank('cats knitting', ring)).toBeCloseTo(0.6)
    expect(ringTextRank('-cats', ring)).toBe(0)
  })

  test('wordSimilarity tolerates typos and partials, like pg_trgm', () => {
    expect(wordSimilarity('writting', 'On writing')).toBeGreaterThan(0.6)
    expect(wordSimilarity('nor', 'Nora Quill')).toBeGreaterThan(0.6)
    expect(wordSimilarity('zebra', 'Nora Quill')).toBeLessThan(0.3)
    expect(wordSimilarity('', 'anything')).toBe(0)
  })

  test('exact names ignore case, accents, punctuation and a leading @', () => {
    expect(isExactName('cozy cats', 'Cozy Cats')).toBe(true)
    expect(isExactName('@cozy-cats', 'x', 'cozy-cats')).toBe(true)
    expect(isExactName('cafe', 'Café')).toBe(true)
    expect(isExactName('cats', 'Cozy Cats')).toBe(false)
    expect(isExactName('', '')).toBe(false)
  })
})
