import Link from 'next/link'
import { useRouter } from 'next/router'
import { PixelIcon } from '@/components/ui/PixelIcon'
import SearchBox from './SearchBox'

/**
 * Search for the site header. Wide screens get a small input with people
 * and ring suggestions; narrow ones a "Search" link to /search, which opens
 * with the input focused. Renders nothing on /search itself, which has its
 * own big input.
 *
 * Wrappers carry the responsive classes, not the link or button: the site
 * CSS's `a.btn` / `button` display rules beat Tailwind's `hidden`.
 */
export default function HeaderSearch({ className = '' }: { className?: string }) {
  const router = useRouter()
  if (router.pathname === '/search') return null

  return (
    <div className={className}>
      <div className="hidden lg:block w-56 xl:w-64">
        <SearchBox size="sm" placeholder="Search" />
      </div>
      <span className="lg:hidden">
        <Link href="/search" className="inline-flex items-center gap-1.5 px-2 py-1.5 font-semibold text-nb-ink">
          <PixelIcon name="search" size={16} aria-hidden="true" />
          <span>Search</span>
        </Link>
      </span>
    </div>
  )
}
