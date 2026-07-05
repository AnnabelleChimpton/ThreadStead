import { scoreSearchResult, rankSearchResults } from '@/lib/search/relevance'

describe('scoreSearchResult', () => {
  test('exact title match dominates everything', () => {
    const exactUser = scoreSearchResult({ type: 'user', title: 'annabelle' }, 'annabelle')
    const mentionPost = scoreSearchResult(
      { type: 'post', title: '100 users!', description: 'get rekt annabelle' },
      'annabelle'
    )
    expect(exactUser).toBeGreaterThan(mentionPost)
  })

  test('prefix beats word-boundary beats substring', () => {
    const prefix = scoreSearchResult({ type: 'post', title: 'writing tips' }, 'writ')
    const boundary = scoreSearchResult({ type: 'post', title: 'daily writing' }, 'writ')
    const substring = scoreSearchResult({ type: 'post', title: 'handwriting' }, 'writ')
    expect(prefix).toBeGreaterThan(boundary)
    expect(boundary).toBeGreaterThan(substring)
  })

  test('type weight breaks ties: ring > user > post for identical matches', () => {
    const ring = scoreSearchResult({ type: 'threadring', title: 'writing' }, 'writing')
    const user = scoreSearchResult({ type: 'user', title: 'writing' }, 'writing')
    const post = scoreSearchResult({ type: 'post', title: 'writing' }, 'writing')
    expect(ring).toBeGreaterThan(user)
    expect(user).toBeGreaterThan(post)
  })

  test('matching is case-insensitive', () => {
    expect(scoreSearchResult({ type: 'user', title: 'Annabelle' }, 'ANNABELLE')).toBe(
      scoreSearchResult({ type: 'user', title: 'annabelle' }, 'annabelle')
    )
  })

  test('regex metacharacters in queries do not crash scoring', () => {
    expect(() => scoreSearchResult({ type: 'post', title: 'c++ tips (2024)' }, 'c++')).not.toThrow()
    expect(scoreSearchResult({ type: 'post', title: 'c++ tips' }, 'c++')).toBeGreaterThan(0)
  })
})

describe('rankSearchResults', () => {
  test('sorts by score and caps at limit', () => {
    const ranked = rankSearchResults(
      [
        { type: 'post', title: 'mentions annabelle somewhere', description: 'annabelle' },
        { type: 'user', title: 'annabelle' },
        { type: 'post', title: 'unrelated' },
      ],
      'annabelle',
      2
    )
    expect(ranked).toHaveLength(2)
    expect(ranked[0].title).toBe('annabelle')
    expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[1].relevanceScore)
  })
})
