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

export const SCOPES = ['all', 'people', 'rings', 'posts', 'places', 'indie', 'web'] as const
export type SearchScope = (typeof SCOPES)[number]

/** Tab labels. "Indie Index" is the one name for the community index. */
export const SCOPE_LABELS: Record<SearchScope, string> = {
  all: 'Everything',
  people: 'People',
  rings: 'Rings',
  posts: 'Posts',
  places: 'Homes & pages',
  indie: 'Indie Index',
  web: 'Wider web',
}

/** The /api/search `type` value(s) behind each on-site scope. */
export const SCOPE_API_TYPES: Partial<Record<SearchScope, string>> = {
  people: 'users',
  rings: 'threadrings',
  posts: 'posts',
  places: 'homes,pages',
}

/** Queries this short never reach the paid web tier. */
export const MIN_WEB_QUERY_LENGTH = 3

/** With fewer on-site results than this, the web tier loads by itself. */
export const AUTO_WEB_BELOW = 5

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
  web: 'web',
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

/** Whether the "All" view should load the web tier without being asked. */
export function shouldAutoLoadWeb(q: string, onSiteCount: number, enabled: boolean): boolean {
  return enabled && q.trim().length >= MIN_WEB_QUERY_LENGTH && onSiteCount < AUTO_WEB_BELOW
}
