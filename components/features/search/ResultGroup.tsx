import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Status } from './useUnifiedSearch'

/**
 * The site CSS's unlayered `.thread-module ul { padding-left: 1.25rem }`
 * beats Tailwind's pl-0, so result lists reset it inline.
 */
export const LIST_RESET = { paddingLeft: 0, listStyle: 'none' } as const

/** Placeholder rows while a group loads, shaped like the real rows. */
export function SkeletonRows({ rows = 3, media = true }: { rows?: number; media?: boolean }) {
  const bar = 'block rounded bg-nb-ink-mid/20 motion-safe:animate-pulse'
  return (
    <ul aria-hidden="true" className="divide-y divide-dotted divide-nb-ink-mid/40" style={LIST_RESET}>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 p-3">
          {media && <span className={`${bar} w-10 h-10 shrink-0 rounded-cozy`} />}
          <span className="flex-1 space-y-2">
            <span className={`${bar} h-4 w-2/5`} />
            <span className={`${bar} h-3 w-1/4`} />
            <span className={`${bar} h-3 w-4/5`} />
          </span>
        </li>
      ))}
    </ul>
  )
}

interface ResultGroupProps {
  id: string
  title: string
  status: Status
  /** Rows, already rendered as <li>s. */
  children?: ReactNode
  count: number
  /** "See all" goes here; left out when everything is already shown. */
  seeAllHref?: string
  seeAllLabel?: string
  /** Friendly text for a failed group; there's a default. */
  error?: string
  /** Shown under the title (e.g. where results come from). */
  note?: ReactNode
  media?: boolean
}

/**
 * One group of results on /search ("People", "Rings", …). Hidden once it has
 * loaded with nothing in it, so the page only shows what matched.
 */
export default function ResultGroup({
  id,
  title,
  status,
  children,
  count,
  seeAllHref,
  seeAllLabel,
  error,
  note,
  media = true,
}: ResultGroupProps) {
  if (status === 'idle') return null
  if (status === 'done' && count === 0) return null

  const headingId = `${id}-heading`
  return (
    <section aria-labelledby={headingId} aria-busy={status === 'loading'} className="thread-module p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-3 px-3 pt-1">
        <h2 id={headingId} className="thread-headline text-xl font-bold">
          {title}
        </h2>
        {status === 'done' && seeAllHref && (
          <Link href={seeAllHref} className="text-sm font-semibold text-nb-ink underline underline-offset-2 shrink-0">
            {seeAllLabel ?? `See all ${count}`}
          </Link>
        )}
      </div>
      {note && <p className="text-sm text-nb-ink-mid px-3">{note}</p>}
      <div className="mt-2">
        {status === 'loading' && <SkeletonRows media={media} />}
        {status === 'error' && count === 0 && (
          <p role="status" className="px-3 py-2 text-sm text-nb-ink-mid">
            {error ?? 'This part of search didn’t load. Try again in a minute.'}
          </p>
        )}
        {(status === 'done' || (status === 'error' && count > 0)) && (
          <ul className="divide-y divide-dotted divide-nb-ink-mid/40" style={LIST_RESET}>
            {children}
          </ul>
        )}
      </div>
    </section>
  )
}
