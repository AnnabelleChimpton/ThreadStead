import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { searchHref, type SearchScope } from '@/lib/search/url-state'

/**
 * The one search input: /search, the homepage and the header all use it.
 *
 * A plain GET form to /search (works before hydration and without JS), with
 * as-you-type suggestions for people and rings from the directory and rings
 * endpoints. Posts, the Indie Index and the web are searched only on submit.
 */

interface Suggestion {
  kind: 'person' | 'ring'
  label: string
  sub: string
  href: string
}

const SUGGEST_MIN = 2
const SUGGEST_DELAY_MS = 200
const SUGGEST_EACH = 4

async function fetchSuggestions(q: string, signal: AbortSignal): Promise<Suggestion[]> {
  const term = encodeURIComponent(q)
  const rings = (extra: string) =>
    fetch(`/api/threadrings?search=${term}&limit=${SUGGEST_EACH}&sort=members${extra}`, { signal })
      .then((r) => (r.ok ? r.json() : { threadRings: [] }))
      .catch(() => ({ threadRings: [] }))
  // /api/threadrings leaves out a signed-in viewer's own rings unless asked
  // for them (membership=true), so ask both ways and merge.
  const [people, notMine, mine] = await Promise.all([
    fetch(`/api/directory?search=${term}&limit=${SUGGEST_EACH}`, { signal })
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .catch(() => ({ users: [] })),
    rings(''),
    rings('&membership=true'),
  ])
  const out: Suggestion[] = []
  for (const u of (people.users ?? []).slice(0, SUGGEST_EACH)) {
    if (!u?.username) continue
    out.push({ kind: 'person', label: u.displayName || u.username, sub: `@${u.username}`, href: `/resident/${u.username}` })
  }
  const seen = new Set<string>()
  const ringRows = [...(mine.threadRings ?? []), ...(notMine.threadRings ?? [])]
    .filter((r) => r?.slug && !seen.has(r.slug) && seen.add(r.slug))
    .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
  for (const r of ringRows.slice(0, SUGGEST_EACH)) {
    const members = r.memberCount ?? 0
    out.push({ kind: 'ring', label: r.name || r.slug, sub: `${members} ${members === 1 ? 'member' : 'members'}`, href: `/tr/${r.slug}` })
  }
  return out
}

export interface SearchBoxProps {
  /** Starting text (the current query on /search). */
  defaultValue?: string
  /** Scope to keep when searching again from /search. */
  scope?: SearchScope
  size?: 'sm' | 'md' | 'lg'
  /** Visible label above the input; otherwise it's screen-reader only. */
  label?: string
  showLabel?: boolean
  placeholder?: string
  autoFocus?: boolean
  suggest?: boolean
  className?: string
  /** Called after navigating (e.g. to close a header sheet). */
  onNavigate?: () => void
}

export default function SearchBox({
  defaultValue = '',
  scope,
  size = 'md',
  label = 'Search ThreadStead',
  showLabel = false,
  // Short enough for a phone's search box (signup audit #11)
  placeholder = 'People, rings, posts…',
  autoFocus = false,
  suggest = true,
  className = '',
  onNavigate,
}: SearchBoxProps) {
  const router = useRouter()
  const id = useId()
  const inputId = `${id}-q`
  const listId = `${id}-suggestions`
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const cache = useRef(new Map<string, Suggestion[]>())
  const wrapRef = useRef<HTMLDivElement>(null)

  // Back/forward or a new search elsewhere changes the query under us.
  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    if (!suggest) return
    const q = value.trim()
    if (q.length < SUGGEST_MIN || q === defaultValue.trim()) {
      setSuggestions([])
      return
    }
    const hit = cache.current.get(q.toLowerCase())
    if (hit) {
      setSuggestions(hit)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchSuggestions(q, controller.signal)
        .then((list) => {
          cache.current.set(q.toLowerCase(), list)
          setSuggestions(list)
          setActive(-1)
        })
        .catch(() => {})
    }, SUGGEST_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value, suggest, defaultValue])

  // Close on a click outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const showList = open && suggestions.length > 0

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
    onNavigate?.()
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    go(searchHref({ q: value, scope }))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
      return
    }
    if (!showList) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setOpen(true)
        setActive(0)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      setActive((i) => (i + 1) % suggestions.length)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
      e.preventDefault()
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      go(suggestions[active].href)
    }
  }

  const inputSize =
    size === 'lg' ? 'text-lg px-4 py-3' : size === 'sm' ? 'text-sm px-3 py-1.5' : 'text-base px-3 py-2.5'
  const buttonSize = size === 'lg' ? 'px-5 py-3 text-lg' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5'

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form role="search" action="/search" method="get" onSubmit={onSubmit}>
        <label htmlFor={inputId} className={showLabel ? 'thread-label block mb-1' : 'sr-only'}>
          {label}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            name="q"
            type="search"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            enterKeyHint="search"
            maxLength={200}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            className={`min-w-0 flex-1 border-2 border-nb-ink-mid bg-nb-paper text-nb-ink rounded-cozy placeholder:text-nb-ink-mid/80 focus:outline-none focus:border-nb-ink ${inputSize}`}
          />
          {scope && scope !== 'all' && <input type="hidden" name="scope" value={scope} />}
          <button type="submit" className={`btn btn--primary inline-flex items-center gap-1.5 font-semibold ${buttonSize}`}>
            <PixelIcon name="search" size={size === 'sm' ? 14 : 16} />
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* Always in the DOM so aria-controls points somewhere. */}
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="absolute left-0 right-0 z-40 mt-1 max-h-80 overflow-auto bg-nb-paper border-2 border-nb-ink-mid rounded-cozy shadow-nb-sm py-1"
      >
        {suggestions.map((s, i) => (
          <li
            key={`${s.kind}:${s.href}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? 'bg-nb-surface' : ''}
          >
            <Link
              href={s.href}
              tabIndex={-1}
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
              onMouseEnter={() => setActive(i)}
              className="ts-card-link flex items-center gap-2 px-3 py-2 text-nb-ink"
            >
              <PixelIcon name={s.kind === 'person' ? 'user' : 'link'} size={14} className="shrink-0 text-nb-ink-mid" />
              <span className="font-semibold truncate">{s.label}</span>
              <span className="text-sm text-nb-ink-mid truncate">{s.sub}</span>
              <span className="ml-auto text-xs text-nb-ink-mid shrink-0">{s.kind === 'person' ? 'Person' : 'Ring'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
