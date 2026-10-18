import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/ButtonLink'
import type { SearchResult } from '@/lib/search/types'
import { HouseThumbnail, RingCard } from './ResultCards'
import { LIST_RESET } from './ResultGroup'
import SearchElsewhere from './SearchElsewhere'

interface Fallbacks {
  rings: SearchResult[]
  ringsAreFallback: boolean
  homes: SearchResult[]
}

/**
 * A search that found nothing on the site: other engines, nearby rings and
 * a few homes from the street.
 */
export default function NothingFound({ q }: { q: string }) {
  const [data, setData] = useState<Fallbacks | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    fetch(`/api/search/nothing-found?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => body && setData(body))
      .catch(() => {})
    return () => controller.abort()
  }, [q])

  return (
    <div className="space-y-4">
      <div className="thread-module p-4 sm:p-6">
        <h2 className="thread-headline text-xl font-bold mb-1">Nothing here matches “{q}”</h2>
        <p className="text-nb-ink">Try fewer or different words, or look further.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link href="/indie#add" className={buttonClasses('secondary')}>
            Know a site? Add it to the index
          </Link>
        </div>
      </div>

      <SearchElsewhere q={q} />

      {data && data.rings.length > 0 && (
        <section aria-labelledby="nf-rings" className="thread-module p-3 sm:p-4">
          <h2 id="nf-rings" className="thread-headline text-xl font-bold px-3 pt-1">
            {data.ringsAreFallback ? 'Some rings to try' : 'Rings with some of those words'}
          </h2>
          <ul className="mt-2 divide-y divide-dotted divide-nb-ink-mid/40" style={LIST_RESET}>
            {data.rings.map((r) => (
              <li key={r.id}>
                <RingCard result={{ ...r, relevanceScore: 0 }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.homes.length > 0 && (
        <section aria-labelledby="nf-homes" className="thread-module p-3 sm:p-4">
          <div className="flex items-baseline justify-between gap-3 px-3 pt-1">
            <h2 id="nf-homes" className="thread-headline text-xl font-bold">A few homes on the street</h2>
            <Link href="/neighborhood" className="text-sm font-semibold text-nb-ink underline underline-offset-2 shrink-0">
              Walk the street
            </Link>
          </div>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2" style={LIST_RESET}>
            {data.homes.map((h) => (
              <li key={h.id}>
                <Link href={h.url} className="ts-card-link flex sm:flex-col items-center gap-3 sm:gap-1 p-3 rounded-cozy text-nb-ink hover:bg-nb-surface/60 sm:text-center">
                  {h.home && <HouseThumbnail house={h.home.house} className="w-16 h-14 sm:w-24 sm:h-20" />}
                  <span className="min-w-0">
                    <span className="block font-bold underline decoration-nb-ink-mid/50 underline-offset-2 break-words">{h.title}</span>
                    {h.home && <span className="block text-sm text-nb-ink-mid">@{h.home.handle}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
