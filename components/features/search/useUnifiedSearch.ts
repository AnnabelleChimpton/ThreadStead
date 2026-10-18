import { useCallback, useEffect, useRef, useState } from 'react'
import type { SearchResult, SearchSection } from '@/lib/search/types'
import { toSiteResults, type SiteResult } from '@/lib/search/sites'
import { shouldAutoLoadWeb, SCOPE_API_TYPES, type SearchScope } from '@/lib/search/url-state'

/**
 * Data for /search. Each group loads on its own request, so the fast local
 * groups render while the hub (rings) and the Indie Index are still working.
 * The wider web loads only when asked, or by itself when everything else
 * together found fewer than 5 things — never while typing.
 */

export type Status = 'idle' | 'loading' | 'done' | 'error'

export interface Group<T> {
  status: Status
  items: T[]
  total: number
  /** There are more than `total` (candidate cap / more pages). */
  more: boolean
  /** Friendly text when this group couldn't load fully. */
  error?: string
}

const empty = <T,>(status: Status = 'idle'): Group<T> => ({ status, items: [], total: 0, more: false })

export type LocalKey = 'users' | 'threadrings' | 'posts' | 'places'

export const GROUP_SIZE = 5
const PAGE_SIZE = 20
const INDIE_FETCH = 20

async function getJson(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
  return body
}

function section(sections: Record<string, SearchSection | undefined>, ...keys: string[]): Group<SearchResult> {
  const parts = keys.map((k) => sections[k]).filter(Boolean) as SearchSection[]
  // Homes and pages share a group: interleave by score, keep the best few.
  const items = parts
    .flatMap((p) => p.results)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, GROUP_SIZE)
  return {
    status: 'done',
    items,
    total: parts.reduce((n, p) => n + p.total, 0),
    more: parts.some((p) => p.capped),
  }
}

// ------------------------------------------------------------ All (grouped) --

export interface GroupedState {
  users: Group<SearchResult>
  threadrings: Group<SearchResult>
  posts: Group<SearchResult>
  places: Group<SearchResult>
  indie: Group<SiteResult>
  web: Group<SiteResult>
  /** On-site groups that degraded (e.g. the hub was down). */
  partial: string[]
}

const initialGrouped = (status: Status): GroupedState => ({
  users: empty(status),
  threadrings: empty(status),
  posts: empty(status),
  places: empty(status),
  indie: empty(status),
  web: empty(),
  partial: [],
})

export function useGroupedSearch(q: string, enabled: boolean, webEnabled: boolean) {
  const [state, setState] = useState<GroupedState>(() => initialGrouped(enabled && q ? 'loading' : 'idle'))
  const webController = useRef<AbortController | null>(null)

  const loadWeb = useCallback(
    (query: string) => {
      if (!webEnabled || !query) return
      webController.current?.abort()
      const controller = new AbortController()
      webController.current = controller
      setState((s) => ({ ...s, web: empty('loading') }))
      getJson(`/api/extsearch?q=${encodeURIComponent(query)}&page=0&perPage=10`, controller.signal)
        .then((body) => {
          const items = toSiteResults(body.results ?? [])
          setState((s) => ({ ...s, web: { status: 'done', items: items.slice(0, GROUP_SIZE), total: items.length, more: items.length > GROUP_SIZE } }))
        })
        .catch((e) => {
          if (controller.signal.aborted) return
          console.error('Wider web search failed:', e)
          setState((s) => ({ ...s, web: empty('error') }))
        })
    },
    [webEnabled]
  )

  useEffect(() => {
    if (!enabled || !q) {
      setState(initialGrouped('idle'))
      return
    }
    const controller = new AbortController()
    const { signal } = controller
    setState(initialGrouped('loading'))
    const term = encodeURIComponent(q)
    const settled = { local: -1, rings: -1, indie: -1 }
    const maybeAutoWeb = () => {
      if (settled.local < 0 || settled.rings < 0 || settled.indie < 0 || signal.aborted) return
      if (shouldAutoLoadWeb(q, settled.local + settled.rings + settled.indie, webEnabled)) loadWeb(q)
    }

    getJson(`/api/search?q=${term}&view=grouped&type=users,posts,pages,homes&per=${GROUP_SIZE}`, signal)
      .then((body) => {
        const s = body.sections ?? {}
        const next = { users: section(s, 'users'), posts: section(s, 'posts'), places: section(s, 'homes', 'pages') }
        settled.local = next.users.total + next.posts.total + next.places.total
        setState((prev) => ({ ...prev, ...next }))
      })
      .catch((e) => {
        if (signal.aborted) return
        settled.local = 0
        console.error('Search failed:', e)
        const failed = empty<SearchResult>('error')
        setState((prev) => ({ ...prev, users: failed, posts: failed, places: failed }))
      })
      .finally(maybeAutoWeb)

    getJson(`/api/search?q=${term}&view=grouped&type=threadrings&per=${GROUP_SIZE}`, signal)
      .then((body) => {
        const rings = section(body.sections ?? {}, 'threadrings')
        settled.rings = rings.total
        setState((prev) => ({
          ...prev,
          threadrings: body.partial ? { ...rings, status: 'error', error: 'Rings aren’t answering right now. Try again in a minute.' } : rings,
          partial: body.partial ? ['threadrings'] : prev.partial,
        }))
      })
      .catch((e) => {
        if (signal.aborted) return
        settled.rings = 0
        console.error('Ring search failed:', e)
        setState((prev) => ({ ...prev, threadrings: empty('error') }))
      })
      .finally(maybeAutoWeb)

    // Validated sites only (the endpoint's default), one row per domain.
    getJson(`/api/community-index/search?q=${term}&limit=${INDIE_FETCH}`, signal)
      .then((body) => {
        const sites = toSiteResults(body.results ?? [])
        settled.indie = sites.length
        setState((prev) => ({
          ...prev,
          indie: {
            status: 'done',
            items: sites.slice(0, GROUP_SIZE),
            total: sites.length,
            more: (body.pagination?.total ?? 0) > INDIE_FETCH,
          },
        }))
      })
      .catch((e) => {
        if (signal.aborted) return
        settled.indie = 0
        console.error('Indie Index search failed:', e)
        setState((prev) => ({ ...prev, indie: empty('error') }))
      })
      .finally(maybeAutoWeb)

    return () => {
      controller.abort()
      webController.current?.abort()
    }
  }, [q, enabled, webEnabled, loadWeb])

  return { state, loadWeb: () => loadWeb(q) }
}

// -------------------------------------------------------- One scope (list) --

export interface ListState<T> {
  status: Status
  items: T[]
  /** Loading another page. */
  loadingMore: boolean
  hasMore: boolean
  error?: string
}

type ListItem = SearchResult | SiteResult

/** The full list for one scope, with "Show more". */
export function useScopedSearch(q: string, scope: SearchScope, webEnabled: boolean) {
  const [state, setState] = useState<ListState<ListItem>>({ status: 'idle', items: [], loadingMore: false, hasMore: false })
  const next = useRef<{ cursor?: string | null; offset?: number; page?: number }>({})
  const controllerRef = useRef<AbortController | null>(null)

  const active = !!q && scope !== 'all' && (scope !== 'web' || webEnabled)

  const fetchPage = useCallback(
    async (signal: AbortSignal, first: boolean): Promise<{ items: ListItem[]; hasMore: boolean }> => {
      const term = encodeURIComponent(q)
      const apiType = SCOPE_API_TYPES[scope]
      if (apiType) {
        const cursor = first ? '' : `&cursor=${encodeURIComponent(next.current.cursor ?? '')}`
        const body = await getJson(`/api/search?q=${term}&type=${apiType}&limit=${PAGE_SIZE}${cursor}`, signal)
        next.current.cursor = body.nextCursor
        return { items: body.results ?? [], hasMore: !!body.nextCursor }
      }
      if (scope === 'indie') {
        const offset = first ? 0 : next.current.offset ?? 0
        const body = await getJson(`/api/community-index/search?q=${term}&limit=${PAGE_SIZE}&offset=${offset}`, signal)
        const rows = body.results ?? []
        next.current.offset = offset + rows.length
        return { items: toSiteResults(rows), hasMore: offset + rows.length < (body.pagination?.total ?? 0) }
      }
      // web: the API pages 0..9
      const page = first ? 0 : next.current.page ?? 0
      const body = await getJson(`/api/extsearch?q=${term}&page=${page}&perPage=${PAGE_SIZE}`, signal)
      const rows = body.results ?? []
      next.current.page = page + 1
      return { items: toSiteResults(rows), hasMore: rows.length >= PAGE_SIZE && page < 9 }
    },
    [q, scope]
  )

  useEffect(() => {
    if (!active) {
      setState({ status: 'idle', items: [], loadingMore: false, hasMore: false })
      return
    }
    const controller = new AbortController()
    controllerRef.current = controller
    next.current = {}
    setState({ status: 'loading', items: [], loadingMore: false, hasMore: false })
    fetchPage(controller.signal, true)
      .then(({ items, hasMore }) => setState({ status: 'done', items, loadingMore: false, hasMore }))
      .catch((e) => {
        if (controller.signal.aborted) return
        console.error('Search failed:', e)
        setState({ status: 'error', items: [], loadingMore: false, hasMore: false })
      })
    return () => controller.abort()
  }, [active, fetchPage])

  const loadMore = useCallback(() => {
    const controller = controllerRef.current
    if (!controller || controller.signal.aborted) return
    setState((s) => ({ ...s, loadingMore: true }))
    fetchPage(controller.signal, false)
      .then(({ items, hasMore }) =>
        setState((s) => {
          // Sites can repeat across pages (one per domain is per page).
          const seen = new Set(s.items.map((i) => ('id' in i ? `${i.type}:${i.id}` : i.url)))
          const fresh = items.filter((i) => !seen.has('id' in i ? `${i.type}:${i.id}` : i.url))
          return { status: 'done', items: [...s.items, ...fresh], loadingMore: false, hasMore }
        })
      )
      .catch((e) => {
        if (controller.signal.aborted) return
        console.error('Search failed:', e)
        setState((s) => ({ ...s, loadingMore: false, error: 'More results didn’t load. Try again.' }))
      })
  }, [fetchPage])

  return { state, loadMore }
}
