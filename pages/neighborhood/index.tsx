// The street: every pixel home, in the order people moved in, one street of
// HOUSES_PER_STREET at a time (?street=2). /neighborhood/explore/* redirects
// here. Ring and mutual-friend streets still use ./[type]/[param].
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import Layout from '@/components/ui/layout/Layout'
import Street from '@/components/pixel-homes/Street'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { getSessionUser } from '@/lib/auth/server'
import {
  HOUSES_PER_STREET,
  getRecentlyDecorated,
  getStreetPage,
  type StreetHome,
  type StreetPage,
} from '@/lib/pixel-homes/street'
import { getStreetRingSigns, type RingSign } from '@/lib/pixel-homes/street-rings'
import { getCollectionNotice, noticeText } from '@/lib/pixel-homes/collections'
import PageMeta from '@/components/ui/layout/PageMeta'

interface NeighborhoodProps {
  street: StreetPage
  recent: Array<Pick<StreetHome, 'username' | 'displayName' | 'snapshotCardUrl'>>
  at: string | null
  ringSigns: RingSign[]
  /** "Autumn 2026 decorations are out until Nov 30.", while the current collection is out */
  collectionLine: string | null
  /** The viewer's username, so their own lot says so */
  mine: string | null
}

/** ?street= is 1-based for people; StreetPage.index is 0-based. */
const streetHref = (index: number) => (index === 0 ? '/neighborhood' : `/neighborhood?street=${index + 1}`)

export default function Neighborhood({ street, recent, at, ringSigns, collectionLine, mine }: NeighborhoodProps) {
  const first = street.index * HOUSES_PER_STREET + 1
  const last = Math.min(first + HOUSES_PER_STREET - 1, street.totalHomes)

  return (
    <Layout>
      <PageMeta title={street.name} description="Everyone's pixel homes, in the order they moved in." path={streetHref(street.index)} />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-1">{street.name}</h1>
            <p className="text-nb-ink-mid text-sm sm:text-base mb-0">
              Houses {first}–{last} of {street.totalHomes}, in the order people moved in.
            </p>
            {collectionLine && <p className="text-nb-ink-mid text-sm sm:text-base mt-1 mb-0">{collectionLine}</p>}
          </div>
          <p className="text-sm sm:text-base mb-0 flex flex-wrap gap-x-3">
            <Link href="/neighborhood/random">A random house</Link>
            <span aria-hidden="true">·</span>
            <Link href="/neighborhood/residents">Residents</Link>
          </p>
        </header>

        <Street homes={street.homes} at={at} ringSigns={ringSigns} mine={mine} />

        <nav aria-label="Streets" className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm sm:text-base">
          {street.previous ? (
            <Link href={streetHref(street.previous.index)}>← {street.previous.name}</Link>
          ) : <span />}
          <span className="text-nb-ink-mid">Street {street.index + 1} of {street.streetCount}</span>
          {street.next ? (
            <Link href={streetHref(street.next.index)}>{street.next.name} →</Link>
          ) : <span />}
        </nav>

        {recent.length > 0 && (
          <section className="mt-10" aria-labelledby="recently-decorated">
            <h2 id="recently-decorated" className="thread-headline text-xl font-bold mb-3">Recently decorated</h2>
            <ul className="flex flex-wrap gap-4 list-none p-0 m-0">
              {recent.map((home) => (
                <li key={home.username}>
                  <Link href={`/home/${encodeURIComponent(home.username)}`} className="block w-[256px]">
                    {/* The whole yard, at half size for the card (1 device
                        pixel per art pixel on most screens) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={home.snapshotCardUrl ?? ''}
                      alt=""
                      width={256}
                      height={176}
                      loading="lazy"
                      className="block border border-thread-sage"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className="block mt-1 text-sm truncate">{home.displayName || home.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<NeighborhoodProps> = async (context) => {
  const viewer = await getSessionUser(context.req as any)
  const requested = Number.parseInt(String(context.query.street ?? '1'), 10)
  const index = Number.isFinite(requested) && requested > 0 ? requested - 1 : 0
  const at = typeof context.query.at === 'string' ? context.query.at : null

  const [street, recent, collection] = await Promise.all([
    getStreetPage(db, { index, viewerId: viewer?.id, host: SITE_NAME }),
    getRecentlyDecorated(db, { viewerId: viewer?.id, host: SITE_NAME }),
    getCollectionNotice(db),
  ])

  // One look at the hub per street, cached and bounded; no hub, no signs
  const ringSigns = await getStreetRingSigns(db, street.homes, { viewerId: viewer?.id })

  const mine = viewer?.primaryHandle?.split('@')[0] ?? null
  return { props: { street, recent, at, ringSigns, collectionLine: collection ? noticeText(collection) : null, mine } }
}
