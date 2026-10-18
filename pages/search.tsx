import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { GetServerSideProps } from 'next'
import Layout from '@/components/ui/layout/Layout'
import { buttonClasses } from '@/components/ui/ButtonLink'
import EmptyState from '@/components/ui/feedback/EmptyState'
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { publicEnv } from '@/lib/config/public-env'
import SearchBox from '@/components/features/search/SearchBox'
import ResultGroup, { LIST_RESET, SkeletonRows } from '@/components/features/search/ResultGroup'
import { ResultCard, SiteCard } from '@/components/features/search/ResultCards'
import NothingFound from '@/components/features/search/NothingFound'
import SurpriseCard from '@/components/features/search/SurpriseCard'
import EnhancedCommunityBrowser from '@/components/features/search/EnhancedCommunityBrowser'
import { useGroupedSearch, useScopedSearch } from '@/components/features/search/useUnifiedSearch'
import type { SearchResult } from '@/lib/search/types'
import type { SiteResult } from '@/lib/search/sites'
import {
  MIN_WEB_QUERY_LENGTH,
  SCOPES,
  SCOPE_LABELS,
  parseSearchState,
  searchHref,
  type SearchScope,
} from '@/lib/search/url-state'

interface SearchPageProps {
  /** Web tier on/off (NEXT_PUBLIC_ENABLE_EXTSEARCH, same check as /api/extsearch). */
  extSearchEnabled: boolean
}

/**
 * /search — the one search page. Query and scope live in the URL
 * (lib/search/url-state.ts); /discover/search redirects here.
 */
export default function SearchPage({ extSearchEnabled }: SearchPageProps) {
  const router = useRouter()
  // gSSP makes router.query complete on the first render, and every change
  // to q/scope is a navigation, so the URL is the only state.
  const { q, scope } = parseSearchState(router.query)
  const scopes = SCOPES.filter((s) => s !== 'web' || extSearchEnabled)
  const current: SearchScope = scopes.includes(scope) ? scope : 'all'

  const title = q ? `${q} – Search` : 'Search'

  return (
    <Layout>
      <Head>
        <title>{`${title} | ThreadStead`}</title>
        <meta name="robots" content={q ? 'noindex, follow' : 'index, follow'} />
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="mb-3 sm:mb-4">
          <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Search</h1>
          <SearchBox defaultValue={q} scope={current === 'all' ? undefined : current} size="lg" autoFocus={!q} />
        </div>

        {q && <ScopeTabs q={q} current={current} scopes={scopes} />}

        {!q && <Start scope={current} />}
        {q && current === 'all' && <AllResults q={q} webEnabled={extSearchEnabled} />}
        {q && current !== 'all' && <ScopedResults q={q} scope={current} webEnabled={extSearchEnabled} />}
      </div>
    </Layout>
  )
}

function ScopeTabs({ q, current, scopes }: { q: string; current: SearchScope; scopes: SearchScope[] }) {
  return (
    <nav aria-label="What to search" className="mb-4 -mx-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex whitespace-nowrap border-b border-nb-ink-mid/40 min-w-max" style={LIST_RESET}>
        {scopes.map((s) => {
          const selected = s === current
          return (
            <li key={s}>
              <Link
                href={searchHref({ q, scope: s })}
                aria-current={selected ? 'page' : undefined}
                className="ts-tab ts-card-link inline-block"
                // .ts-tab's selected look keys off aria-selected (buttons);
                // these are links, so set it here.
                style={selected ? { color: 'var(--ha-ink-dark, #2E4B3F)', borderBottomColor: 'var(--ha-ink-dark, #2E4B3F)' } : undefined}
              >
                {SCOPE_LABELS[s]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** /search with no query yet. */
function Start({ scope }: { scope: SearchScope }) {
  if (scope === 'indie') {
    return (
      <div className="space-y-4">
        <p className="text-nb-ink">
          The Indie Index is a list of personal and small sites that residents found and checked. Search it above, or
          browse it here.
        </p>
        <EnhancedCommunityBrowser query="" includeUnvalidated={false} />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <p className="text-nb-ink">
        Search finds people, rings, posts and homes here, then sites from the Indie Index. Put a phrase in quotes, or a
        minus before a word to leave it out.
      </p>
      <SurpriseCard />
      <section aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="thread-headline text-xl font-bold mb-2">
          Or browse
        </h2>
        <ul className="flex flex-wrap gap-2" style={LIST_RESET}>
          {[
            { href: '/neighborhood/residents', label: 'Residents' },
            { href: '/threadrings', label: 'Rings' },
            { href: '/neighborhood', label: 'The street' },
            { href: searchHref({ scope: 'indie' }), label: 'Indie Index' },
          ].map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={buttonClasses('secondary', 'sm')}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function rows(items: SearchResult[]) {
  return items.map((r) => (
    <li key={`${r.type}:${r.id}`}>
      <ResultCard result={r} />
    </li>
  ))
}

function siteRows(items: SiteResult[], source: 'web' | 'indie_index', q: string) {
  return items.map((s) => (
    <li key={s.url}>
      <SiteCard site={s} source={source} query={q} />
    </li>
  ))
}

function countLabel(n: number, more: boolean) {
  return `See all ${n}${more ? '+' : ''}`
}

/** "Everything": a few of each kind, in a fixed order. */
function AllResults({ q, webEnabled }: { q: string; webEnabled: boolean }) {
  const { state, loadWeb } = useGroupedSearch(q, true, webEnabled)
  const { users, threadrings, posts, places, indie, web } = state

  const onSite = [users, threadrings, posts, places, indie]
  const allSettled = onSite.every((g) => g.status === 'done' || g.status === 'error')
  const found = onSite.reduce((n, g) => n + g.items.length, 0)
  const nothing = allSettled && found === 0
  const webAsked = web.status !== 'idle'
  const canAskWeb = webEnabled && !webAsked && q.length >= MIN_WEB_QUERY_LENGTH

  const group = (
    key: 'users' | 'threadrings' | 'posts' | 'places',
    title: string,
    scope: SearchScope,
    media = true
  ) => {
    const g = state[key]
    return (
      <ResultGroup
        id={`group-${key}`}
        title={title}
        status={g.status}
        count={g.total}
        error={g.error}
        media={media}
        seeAllHref={g.total > g.items.length || g.more ? searchHref({ q, scope }) : undefined}
        seeAllLabel={countLabel(g.total, g.more)}
      >
        {rows(g.items)}
      </ResultGroup>
    )
  }

  return (
    <div className="space-y-4">
      {nothing && (
        <NothingFound q={q} webEnabled={webEnabled} webLoaded={webAsked} onSearchWeb={loadWeb} />
      )}

      {group('users', 'People', 'people')}
      {group('threadrings', 'Rings', 'rings')}
      {group('posts', 'Posts', 'posts', false)}
      {group('places', 'Homes and pages', 'places')}

      <ResultGroup
        id="group-indie"
        title="From the indie web"
        note="Sites from the Indie Index, checked by residents."
        status={indie.status}
        count={indie.total}
        media={false}
        seeAllHref={indie.total > indie.items.length || indie.more ? searchHref({ q, scope: 'indie' }) : undefined}
        seeAllLabel={countLabel(indie.total, indie.more)}
      >
        {siteRows(indie.items, 'indie_index', q)}
      </ResultGroup>

      {webEnabled && (
        <ResultGroup
          id="group-web"
          title="From the wider web"
          note="From other search engines. These open in a new tab."
          status={web.status}
          count={web.total}
          media={false}
          seeAllHref={searchHref({ q, scope: 'web' })}
          seeAllLabel="See more"
        >
          {siteRows(web.items, 'web', q)}
        </ResultGroup>
      )}

      {webEnabled && web.status === 'done' && web.total === 0 && (
        <p role="status" className="text-sm text-nb-ink-mid">The wider web had nothing for this either.</p>
      )}

      {canAskWeb && !nothing && allSettled && (
        <div className="text-center pt-2">
          <button type="button" onClick={loadWeb} className={`${buttonClasses('secondary')} inline-flex items-center gap-1.5`}>
            <PixelIcon name="search" size={16} />
            <span>Search the wider small web</span>
          </button>
        </div>
      )}
    </div>
  )
}

/** One scope, the full list with "Show more". */
function ScopedResults({ q, scope, webEnabled }: { q: string; scope: SearchScope; webEnabled: boolean }) {
  const { state, loadMore } = useScopedSearch(q, scope, webEnabled)
  const offsite = scope === 'indie' || scope === 'web'

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="thread-module p-3 sm:p-4" aria-busy="true">
        <SkeletonRows rows={5} media={!offsite && scope !== 'posts'} />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <ErrorDisplay title="Search didn’t load. Try again in a minute." />
    )
  }
  if (state.items.length === 0) {
    return (
      <EmptyState
        as="p"
        className="text-left"
        title={<>No {SCOPE_LABELS[scope].toLowerCase()} match “{q}”.</>}
        actions={
          <>
            <Link href={searchHref({ q })} className={buttonClasses('secondary', 'sm')}>
              Search everything instead
            </Link>
            {scope === 'indie' && (
              <Link href="/community-index/submit" className={buttonClasses('secondary', 'sm')}>
                Know a site? Feed the Spider
              </Link>
            )}
          </>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {scope === 'web' && <p className="text-sm text-nb-ink-mid">From other search engines. These open in a new tab.</p>}
      <div className="thread-module p-3 sm:p-4">
        <ul className="divide-y divide-dotted divide-nb-ink-mid/40" style={LIST_RESET}>
          {offsite
            ? siteRows(state.items as SiteResult[], scope === 'web' ? 'web' : 'indie_index', q)
            : rows(state.items as SearchResult[])}
        </ul>
      </div>
      {state.error && <p role="status" className="text-sm text-nb-ink-mid">{state.error}</p>}
      {state.hasMore && (
        <div className="text-center">
          <button type="button" onClick={loadMore} disabled={state.loadingMore} className={buttonClasses('secondary')}>
            {state.loadingMore ? 'Loading…' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<SearchPageProps> = async (context) => {
  // Old-style params (?query=, ?tab=, ?type=) → the canonical URL.
  const state = parseSearchState(context.query)
  const canonical = searchHref(state)
  const asked = context.resolvedUrl
  if (['query', 'tab', 'type'].some((k) => k in context.query) && canonical !== asked) {
    return { redirect: { destination: canonical, permanent: false } }
  }
  return {
    props: {
      // A real prop again: e312d77 (Nov 2025) dropped the old page's gSSP,
      // so the flag was always undefined and the Web tab never showed.
      extSearchEnabled: publicEnv.NEXT_PUBLIC_ENABLE_EXTSEARCH === true,
    },
  }
}
