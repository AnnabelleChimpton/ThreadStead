import { legacyRedirectHref, parseSearchState, searchHref } from '../url-state'

describe('parseSearchState', () => {
  it('reads q and scope', () => {
    expect(parseSearchState({ q: 'cats', scope: 'rings' })).toEqual({ q: 'cats', scope: 'rings' })
  })

  it('defaults to everything and trims the query', () => {
    expect(parseSearchState({ q: '  cats  ' })).toEqual({ q: 'cats', scope: 'all' })
    expect(parseSearchState({})).toEqual({ q: '', scope: 'all' })
  })

  it('ignores an unknown scope', () => {
    expect(parseSearchState({ q: 'x', scope: 'everything' }).scope).toBe('all')
  })

  it('takes the first value of a repeated param', () => {
    expect(parseSearchState({ q: ['one', 'two'], scope: ['people', 'rings'] })).toEqual({ q: 'one', scope: 'people' })
  })

  it('caps the query at 200 characters', () => {
    expect(parseSearchState({ q: 'a'.repeat(500) }).q).toHaveLength(200)
  })

  it('maps old /discover/search params onto a scope', () => {
    expect(parseSearchState({ q: 'x', tab: 'indie' }).scope).toBe('indie')
    expect(parseSearchState({ q: 'x', tab: 'community' }).scope).toBe('indie')
    // The wider web is links under "Everything" now (SEARCH_PLAN.md §3.4).
    expect(parseSearchState({ q: 'x', tab: 'web' }).scope).toBe('all')
    expect(parseSearchState({ q: 'x', scope: 'web' }).scope).toBe('all')
    expect(parseSearchState({ q: 'x', tab: 'site' }).scope).toBe('all')
    expect(parseSearchState({ q: 'x', tab: 'all', type: 'users' }).scope).toBe('people')
    expect(parseSearchState({ q: 'x', type: 'threadrings' }).scope).toBe('rings')
    expect(parseSearchState({ query: 'old name' }).q).toBe('old name')
  })

  it('prefers an explicit scope over old params', () => {
    expect(parseSearchState({ q: 'x', scope: 'posts', tab: 'web' }).scope).toBe('posts')
  })
})

describe('searchHref', () => {
  it('leaves out the defaults', () => {
    expect(searchHref({ q: 'cats' })).toBe('/search?q=cats')
    expect(searchHref({ q: 'cats', scope: 'all' })).toBe('/search?q=cats')
    expect(searchHref({})).toBe('/search')
    expect(searchHref({ q: '   ' })).toBe('/search')
  })

  it('encodes the query and keeps the scope', () => {
    expect(searchHref({ q: 'cats & "dogs"', scope: 'posts' })).toBe('/search?q=cats+%26+%22dogs%22&scope=posts')
    expect(searchHref({ scope: 'indie' })).toBe('/search?scope=indie')
  })

  it('round-trips through parseSearchState', () => {
    for (const state of [
      { q: 'weekend imrul', scope: 'people' as const },
      { q: '-spam "exact phrase"', scope: 'all' as const },
      { q: 'café', scope: 'indie' as const },
    ]) {
      const params = Object.fromEntries(new URLSearchParams(searchHref(state).split('?')[1]))
      expect(parseSearchState(params)).toEqual(state)
    }
  })
})

describe('legacyRedirectHref', () => {
  it('keeps the query and maps the tab, dropping old filter flags', () => {
    expect(legacyRedirectHref({ q: 'cats', tab: 'indie', indie: 'true', noTrackers: 'true' })).toBe(
      '/search?q=cats&scope=indie'
    )
    expect(legacyRedirectHref({ q: 'cats', tab: 'all', type: 'all' })).toBe('/search?q=cats')
    expect(legacyRedirectHref({ tab: 'indie' })).toBe('/search?scope=indie')
    expect(legacyRedirectHref({})).toBe('/search')
  })
})
