import Link from 'next/link'
import { useRouter } from 'next/router'
import type { GetServerSideProps } from 'next'
import Layout from '@/components/ui/layout/Layout'
import { buttonClasses } from '@/components/ui/ButtonLink'
import EmptyState from '@/components/ui/feedback/EmptyState'
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay'
import SearchBox from '@/components/features/search/SearchBox'
import ResultGroup, { LIST_RESET, SkeletonRows } from '@/components/features/search/ResultGroup'
import { ResultCard } from '@/components/features/search/ResultCards'
import IndieSiteCard from '@/components/features/search/IndieSiteCard'
import SearchElsewhere from '@/components/features/search/SearchElsewhere'
import NothingFound from '@/components/features/search/NothingFound'
import SurpriseCard from '@/components/features/search/SurpriseCard'
import { useGroupedSearch, useScopedSearch } from '@/components/features/search/useUnifiedSearch'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { SearchResult } from '@/lib/search/types'
import type { IndieSite } from '@/lib/search/indie'
import {
  SCOPES,
  SCOPE_LABELS,
  parseSearchState,
  searchHref,
  type SearchScope,
} from '@/lib/search/url-state'
import PageMeta from '@/components/ui/layout/PageMeta'

/**
 * /search — the one search page. Query and scope live in the URL
 * (lib/search/url-state.ts); /discover/search redirects here.
 */
export default function SearchPage() {
  const router = useRouter()
  // gSSP makes router.query complete on the first render, and every change
  // to q/scope is a navigation, so the URL is the only state.
  const { q, scope } = parseSearchState(router.query)
  const current: SearchScope = SCOPES.includes(scope) ? scope : 'all'

  const title = q ? `${q} – Search` : 'Search'

  return (
    <Layout>
      <PageMeta title={title} description="Search people, posts and rings here, and the small web around them." path="/search" noIndex={!!q} />

      <div className="max-w-4xl mx-auto">
        <div className="mb-3 sm:mb-4">
          <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Search</h1>
          <SearchBox defaultValue={q} scope={current === 'all' ? undefined : current} size="lg" autoFocus={!q} />
        </div>

        {q && <ScopeTabs q={q} current={current} scopes={[...SCOPES]} />}

        {!q && <Start scope={current} />}
        {q && current === 'all' && <AllResults q={q} />}
        {q && current !== 'all' && <ScopedResults q={q} scope={current} />}
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
          The Indie Index is personal sites that people here link to and vouch for, plus a starting pool from Kagi Small
          Web. Search it above, or browse the ones residents picked, newest post first.{' '}
          <Link href="/indie" className="underline underline-offset-2">
            How sites get in
          </Link>
        </p>
        <ScopedResults q="" scope="indie" />
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

function siteRows(items: IndieSite[], canVouch: boolean) {
  return items.map((s) => (
    <li key={s.id}>
      <IndieSiteCard site={s} canVouch={canVouch} />
    </li>
  ))
}

function countLabel(n: number, more: boolean) {
  return `See all ${n}${more ? '+' : ''}`
}

/** "Everything": a few of each kind, in a fixed order. */
function AllResults({ q }: { q: string }) {
  const { state } = useGroupedSearch(q, true)
  const { loggedIn } = useCurrentUser()
  const { users, threadrings, posts, places, indie } = state

  const onSite = [users, threadrings, posts, places, indie]
  const allSettled = onSite.every((g) => g.status === 'done' || g.status === 'error')
  const found = onSite.reduce((n, g) => n + g.items.length, 0)
  const nothing = allSettled && found === 0

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
      {nothing && <NothingFound q={q} />}

      {group('users', 'People', 'people')}
      {group('threadrings', 'Rings', 'rings')}
      {group('posts', 'Posts', 'posts', false)}
      {group('places', 'Homes and pages', 'places')}

      <ResultGroup
        id="group-indie"
        title="From the indie web"
        note="Personal sites people here link to and vouch for, and a pool from Kagi Small Web. They open in a new tab."
        status={indie.status}
        count={indie.total}
        media={false}
        seeAllHref={indie.total > indie.items.length || indie.more ? searchHref({ q, scope: 'indie' }) : undefined}
        seeAllLabel={countLabel(indie.total, indie.more)}
      >
        {siteRows(indie.items, loggedIn)}
      </ResultGroup>

      {!nothing && allSettled && <SearchElsewhere q={q} />}

    </div>
  )
}

/** One scope, the full list with "Show more". */
function ScopedResults({ q, scope }: { q: string; scope: SearchScope }) {
  const { state, loadMore } = useScopedSearch(q, scope)
  const { loggedIn } = useCurrentUser()
  const offsite = scope === 'indie'

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
  if (state.items.length === 0 && !q) {
    return <EmptyState as="p" className="text-left" title="No sites in the index yet." actionLabel="Add one" actionHref="/indie#add" />
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
              <Link href="/indie#add" className={buttonClasses('secondary', 'sm')}>
                Know a site? Add it to the index
              </Link>
            )}
          </>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="thread-module p-3 sm:p-4">
        <ul className="divide-y divide-dotted divide-nb-ink-mid/40" style={LIST_RESET}>
          {offsite ? siteRows(state.items as IndieSite[], loggedIn) : rows(state.items as SearchResult[])}
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Old-style params (?query=, ?tab=, ?type=) → the canonical URL.
  const state = parseSearchState(context.query)
  const canonical = searchHref(state)
  const asked = context.resolvedUrl
  if (['query', 'tab', 'type'].some((k) => k in context.query) && canonical !== asked) {
    return { redirect: { destination: canonical, permanent: false } }
  }
  return { props: {} }
}
