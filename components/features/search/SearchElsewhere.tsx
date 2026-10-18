import { buttonClasses } from '@/components/ui/ButtonLink'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { LIST_RESET } from './ResultGroup'

/**
 * The wider web, as plain links (SEARCH_PLAN.md §3.4): the same query on
 * other engines, opened in a new tab. Nothing goes through this server, so
 * there's no key, no bill and no record of what anyone searched for. No
 * referrer either, so the other engine doesn't see the /search URL.
 */
export const ENGINES = [
  { name: 'Marginalia', href: (q: string) => `https://marginalia-search.com/search?query=${encodeURIComponent(q)}` },
  { name: 'Wiby', href: (q: string) => `https://wiby.me/?q=${encodeURIComponent(q)}` },
  { name: 'Search My Site', href: (q: string) => `https://searchmysite.net/search/?q=${encodeURIComponent(q)}` },
  { name: 'DuckDuckGo', href: (q: string) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
] as const

export default function SearchElsewhere({ q, className = '' }: { q: string; className?: string }) {
  return (
    <section aria-labelledby="elsewhere-heading" className={`thread-module p-3 sm:p-4 ${className}`}>
      <h2 id="elsewhere-heading" className="thread-headline text-xl font-bold px-3 pt-1">
        Search elsewhere
      </h2>
      <p className="text-sm text-nb-ink-mid px-3">The same search on other engines. They open in a new tab.</p>
      <ul className="flex flex-wrap gap-2 px-3 pt-2 pb-1" style={LIST_RESET}>
        {ENGINES.map((engine) => (
          <li key={engine.name}>
            <a
              href={engine.href(q)}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              // .btn sets display on links, so the icon stays inline (see ButtonLink).
              className={`${buttonClasses('secondary', 'sm')} whitespace-nowrap`}
            >
              {engine.name}
              <PixelIcon name="external-link" size={12} className="inline-block align-[-1px] ml-1.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
