/**
 * URL state for /search: the query and the scope live in the URL, so a
 * search can be shared, bookmarked and reached with the back button.
 *
 *   /search?q=cats              everything, grouped
 *   /search?q=cats&scope=rings  one group, the full list
 *
 * Old /discover/search links (tab=…, type=…) map onto a scope here, so the
 * redirect keeps them working.
 */

export const SCOPES = ['all', 'people', 'rings', 'posts', 'places', 'indie'] as const
export type SearchScope = (typeof SCOPES)[number]

/** Tab labels. "Indie Index" is the one name for the community index. */
export const SCOPE_LABELS: Record<SearchScope, string> = {
  all: 'Everything',
  people: 'People',
  rings: 'Rings',
  posts: 'Posts',
  places: 'Homes & pages',
  indie: 'Indie Index',
}

/** The /api/search `type` value(s) behind each on-site scope. */
export const SCOPE_API_TYPES: Partial<Record<SearchScope, string>> = {
  people: 'users',
  rings: 'threadrings',
  posts: 'posts',
  places: 'homes,pages',
}

export interface SearchState {
  q: string
  scope: SearchScope
}

type RawQuery = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

const LEGACY_TABS: Record<string, SearchScope> = {
  all: 'all',
  site: 'all',
  indie: 'indie',
  community: 'indie',
  // The wider web is links to other engines now, under every search.
  web: 'all',
}

const LEGACY_TYPES: Record<string, SearchScope> = {
  users: 'people',
  threadrings: 'rings',
  posts: 'posts',
  pages: 'places',
}

function isScope(value: string): value is SearchScope {
  return (SCOPES as readonly string[]).includes(value)
}

/** Read q + scope from a Next query object (router.query or gSSP context.query). */
export function parseSearchState(query: RawQuery): SearchState {
  const q = first(query.q ?? query.query).trim().slice(0, 200)
  const rawScope = first(query.scope)
  if (isScope(rawScope)) return { q, scope: rawScope }
  // Old /search?scope=web links: the wider web is links under "Everything" now.
  if (rawScope === 'web') return { q, scope: 'all' }

  // /discover/search?tab=…&type=…
  const type = LEGACY_TYPES[first(query.type)]
  if (type) return { q, scope: type }
  return { q, scope: LEGACY_TABS[first(query.tab)] ?? 'all' }
}

/** The canonical /search URL for a state. Defaults are left out. */
export function searchHref({ q, scope }: Partial<SearchState>): string {
  const params = new URLSearchParams()
  const query = (q ?? '').trim()
  if (query) params.set('q', query)
  if (scope && scope !== 'all') params.set('scope', scope)
  const qs = params.toString()
  return qs ? `/search?${qs}` : '/search'
}

/** /discover/search → /search, keeping the query and the tab/type it asked for. */
export function legacyRedirectHref(query: RawQuery): string {
  return searchHref(parseSearchState(query))
}
