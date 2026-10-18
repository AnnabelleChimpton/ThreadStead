import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { IndieSite } from '@/lib/search/indie'
import IndieSiteCard from './IndieSiteCard'
import { LIST_RESET, SkeletonRows } from './ResultGroup'

/** A page of Indie Index sites (browse or candidates) with "Show more". */
export default function IndieList({ view, empty, pageSize = 10 }: { view: 'browse' | 'candidates'; empty: React.ReactNode; pageSize?: number }) {
  const { loggedIn } = useCurrentUser()
  const [items, setItems] = useState<IndieSite[]>([])
  const [next, setNext] = useState<number | null>(0)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(
    async (offset: number, signal?: AbortSignal) => {
      const res = await fetch(`/api/search/indie?view=${view}&limit=${pageSize}&offset=${offset}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as { results: IndieSite[]; nextOffset: number | null }
    },
    [view, pageSize]
  )

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    load(0, controller.signal)
      .then((body) => {
        setItems(body.results)
        setNext(body.nextOffset)
        setStatus('done')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error')
      })
    return () => controller.abort()
  }, [load])

  const more = async () => {
    if (next == null) return
    setLoadingMore(true)
    try {
      const body = await load(next)
      setItems((prev) => [...prev, ...body.results.filter((s) => !prev.some((p) => p.id === s.id))])
      setNext(body.nextOffset)
    } catch {
      // Leave the button so it can be tried again.
    } finally {
      setLoadingMore(false)
    }
  }

  if (status === 'loading') return <SkeletonRows rows={3} media={false} />
  if (status === 'error') return <p className="p-3 text-sm text-nb-ink-mid">This didn’t load. Try again in a minute.</p>
  if (items.length === 0) return <div className="p-3 text-nb-ink-mid">{empty}</div>

  return (
    <>
      <ul className="divide-y divide-dotted divide-nb-ink-mid/40" style={LIST_RESET}>
        {items.map((site) => (
          <li key={site.id}>
            <IndieSiteCard site={site} canVouch={loggedIn} />
          </li>
        ))}
      </ul>
      {next != null && (
        <div className="text-center pt-2">
          <Button variant="secondary" onClick={more} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Show more'}
          </Button>
        </div>
      )}
    </>
  )
}
