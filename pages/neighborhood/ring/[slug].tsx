// A ThreadRing's street: its members' pixel homes, each with its number from
// the main street (lib/pixel-homes/ring-street.ts). Linked from the ring page.
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '@/components/ui/layout/Layout'
import Street from '@/components/pixel-homes/Street'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { getSessionUser } from '@/lib/auth/server'
import { getRingStreet, type RingStreetRing } from '@/lib/pixel-homes/ring-street'
import type { StreetHome } from '@/lib/pixel-homes/street'
import { getStreetRingSigns, type RingSign } from '@/lib/pixel-homes/street-rings'

type RingStreetProps =
  | { kind: 'street'; ring: RingStreetRing; homes: StreetHome[]; at: string | null; ringSigns: RingSign[] }
  | { kind: 'unavailable'; slug: string }

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/

export default function RingStreetPage(props: RingStreetProps) {
  if (props.kind === 'unavailable') {
    return (
      <Layout>
        <Head>
          <title>The ring street</title>
        </Head>
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-2">The ring street</h1>
          <p className="text-nb-ink-mid">
            We can&apos;t reach the ThreadRing hub right now, so this street can&apos;t be drawn. Try again in a minute,
            or go to <Link href={`/tr/${encodeURIComponent(props.slug)}`}>the ring</Link>.
          </p>
        </div>
      </Layout>
    )
  }

  const { ring, homes, at, ringSigns } = props
  const ringHref = `/tr/${encodeURIComponent(ring.slug)}`
  const count = homes.length

  return (
    <Layout>
      <Head>
        <title>{`${ring.name} - The ring street`}</title>
        <meta name="description" content={`The pixel homes of ${ring.name}'s members.`} />
      </Head>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-1">{ring.name}</h1>
            <p className="text-nb-ink-mid text-sm sm:text-base mb-0">
              {count === 1 ? '1 member’s home' : `${count} members’ homes`}, with their numbers from the main street.
            </p>
          </div>
          <p className="text-sm sm:text-base mb-0 flex flex-wrap gap-x-3">
            <Link href={ringHref}>The ring</Link>
            {count > 1 && (
              <>
                <span aria-hidden="true">·</span>
                <a href={`/neighborhood/walk?ring=${encodeURIComponent(ring.slug)}&from=0&go=random`}>A random house</a>
              </>
            )}
            <span aria-hidden="true">·</span>
            <Link href="/neighborhood">The main street</Link>
          </p>
        </header>

        {count === 0 ? (
          <p className="text-nb-ink-mid">
            Nobody in this ring has a pixel home you can visit yet.
          </p>
        ) : (
          <Street homes={homes} at={at} ringSigns={ringSigns} />
        )}
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<RingStreetProps> = async (context) => {
  const slug = typeof context.params?.slug === 'string' ? context.params.slug : ''
  if (!SLUG.test(slug)) return { notFound: true }

  const viewer = await getSessionUser(context.req as any)
  const at = typeof context.query.at === 'string' ? context.query.at : null
  const street = await getRingStreet(db, { slug, viewerId: viewer?.id, host: SITE_NAME })

  if (street.kind === 'none') return { notFound: true }
  if (street.kind === 'unavailable') {
    context.res.statusCode = 503
    return { props: { kind: 'unavailable', slug } }
  }

  // Other rings these members share; this ring doesn't sign its own street
  const ringSigns = await getStreetRingSigns(db, street.homes, { viewerId: viewer?.id, exceptSlugs: [slug] })

  return { props: { kind: 'street', ring: street.ring, homes: street.homes, at, ringSigns } }
}
