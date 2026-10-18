import { useCallback, useEffect, useRef, useState } from 'react'
import type { SearchResult, SearchSection } from '@/lib/search/types'
import type { IndieSite } from '@/lib/search/indie'
import { SCOPE_API_TYPES, type SearchScope } from '@/lib/search/url-state'

/**
 * Data for /search. Each group loads on its own request, so the fast local
 * groups render while the hub (rings) and the Indie Index are still working.
 * The wider web is plain links to other engines (SearchElsewhere), so
 * nothing here fetches it.
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
  indie: Group<IndieSite>
  /** On-site groups that degraded (e.g. the hub was down). */
  partial: string[]
}

const initialGrouped = (status: Status): GroupedState => ({
  users: empty(status),
  threadrings: empty(status),
  posts: empty(status),
  places: empty(status),
  indie: empty(status),
  partial: [],
})

export function useGroupedSearch(q: string, enabled: boolean) {
  const [state, setState] = useState<GroupedState>(() => initialGrouped(enabled && q ? 'loading' : 'idle'))

  useEffect(() => {
    if (!enabled || !q) {
      setState(initialGrouped('idle'))
      return
    }
    const controller = new AbortController()
    const { signal } = controller
    setState(initialGrouped('loading'))
    const term = encodeURIComponent(q)

    getJson(`/api/search?q=${term}&view=grouped&type=users,posts,pages,homes&per=${GROUP_SIZE}`, signal)
      .then((body) => {
        const s = body.sections ?? {}
        setState((prev) => ({ ...prev, users: section(s, 'users'), posts: section(s, 'posts'), places: section(s, 'homes', 'pages') }))
      })
      .catch((e) => {
        if (signal.aborted) return
        console.error('Search failed:', e)
        const failed = empty<SearchResult>('error')
        setState((prev) => ({ ...prev, users: failed, posts: failed, places: failed }))
      })

    getJson(`/api/search?q=${term}&view=grouped&type=threadrings&per=${GROUP_SIZE}`, signal)
      .then((body) => {
        const rings = section(body.sections ?? {}, 'threadrings')
        setState((prev) => ({
          ...prev,
          threadrings: body.partial ? { ...rings, status: 'error', error: 'Rings aren’t answering right now. Try again in a minute.' } : rings,
          partial: body.partial ? ['threadrings'] : prev.partial,
        }))
      })
      .catch((e) => {
        if (signal.aborted) return
        console.error('Ring search failed:', e)
        setState((prev) => ({ ...prev, threadrings: empty('error') }))
      })

    getJson(`/api/search/indie?q=${term}&limit=${GROUP_SIZE}`, signal)
      .then((body) => {
        setState((prev) => ({
          ...prev,
          indie: { status: 'done', items: body.results ?? [], total: body.total ?? 0, more: !!body.capped },
        }))
      })
      .catch((e) => {
        if (signal.aborted) return
        console.error('Indie Index search failed:', e)
        setState((prev) => ({ ...prev, indie: empty('error') }))
      })

    return () => controller.abort()
  }, [q, enabled])

  return { state }
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

type ListItem = SearchResult | IndieSite

/**
 * The full list for one scope, with "Show more". The Indie Index scope also
 * works with no query: it browses the listed sites, newest post first.
 */
export function useScopedSearch(q: string, scope: SearchScope) {
  const [state, setState] = useState<ListState<ListItem>>({ status: 'idle', items: [], loadingMore: false, hasMore: false })
  const next = useRef<{ cursor?: string | null; offset?: number }>({})
  const controllerRef = useRef<AbortController | null>(null)

  const active = scope !== 'all' && (!!q || scope === 'indie')

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
      // The Indie Index: offset paging (it ranks in one pass).
      const offset = first ? 0 : next.current.offset ?? 0
      const params = q ? `q=${term}` : 'view=browse'
      const body = await getJson(`/api/search/indie?${params}&limit=${PAGE_SIZE}&offset=${offset}`, signal)
      next.current.offset = body.nextOffset ?? offset
      return { items: body.results ?? [], hasMore: body.nextOffset != null }
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
          const keyOf = (i: ListItem) => ('type' in i ? `${i.type}:${i.id}` : `site:${i.id}`)
          const seen = new Set(s.items.map(keyOf))
          const fresh = items.filter((i) => !seen.has(keyOf(i)))
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
