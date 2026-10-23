// A ThreadRing's street: its members' pixel homes, each with its number from
// the main street, then everyone in the ring (lib/pixel-homes/ring-street.ts).
// Linked from the ring page; the old members and "every stop" pages land here.
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import Layout from '@/components/ui/layout/Layout'
import Street from '@/components/pixel-homes/Street'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { getSessionUser } from '@/lib/auth/server'
import { getRingStreet, type RingPerson, type RingStreetRing } from '@/lib/pixel-homes/ring-street'
import type { StreetHome } from '@/lib/pixel-homes/street'
import { getStreetRingSigns, type RingSign } from '@/lib/pixel-homes/street-rings'
import PageMeta from '@/components/ui/layout/PageMeta'
import { ringShareImage } from '@/lib/share-images'
import ReportButton from '@/components/ui/feedback/ReportButton'

type RingStreetProps =
  | {
      kind: 'street'
      ring: RingStreetRing
      homes: StreetHome[]
      people: RingPerson[]
      at: string | null
      ringSigns: RingSign[]
      viewerId: string | null
    }
  | { kind: 'unavailable'; slug: string }

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/
const ROLE_NAMES = { host: 'Host', moderator: 'Moderator', member: 'Member' }

function PersonName({ person }: { person: RingPerson }) {
  const className = 'font-semibold text-nb-ink underline decoration-dotted'
  if (person.handle) {
    const href = person.number ? `/home/${encodeURIComponent(person.handle)}` : `/resident/${encodeURIComponent(person.handle)}`
    return <Link href={href} className={className}>{person.name}</Link>
  }
  if (person.profileUrl && /^https?:\/\//i.test(person.profileUrl)) {
    return <a href={person.profileUrl} rel="ugc nofollow" className={className}>{person.name}</a>
  }
  return <span className="font-semibold text-nb-ink">{person.name}</span>
}

function People({ ring, people, viewerId }: { ring: RingStreetRing; people: RingPerson[]; viewerId: string | null }) {
  return (
    <section id="people" className="thread-module mt-6 max-w-3xl">
      <h2 className="thread-headline text-xl font-bold mb-1">Everyone in {ring.name}</h2>
      <p className="text-sm text-nb-ink-mid mb-2">
        In the order the ring&apos;s walk goes. A member&apos;s stop is their own site when they&apos;ve added one, and their
        pixel home otherwise.
      </p>
      <ol className="m-0 p-0 list-none divide-y divide-dotted divide-nb-ink-mid/30">
        {people.map((person) => (
          <li key={person.key} className="flex items-center gap-3 py-3">
            <span className="w-14 flex-shrink-0 text-sm text-nb-ink-mid tabular-nums">{person.number ? `No. ${person.number}` : ''}</span>
            <div className="min-w-0 flex-1">
              <PersonName person={person} />
              <div className="text-sm text-nb-ink-mid break-words">
                {ROLE_NAMES[person.role]}
                {person.site && (
                  <>
                    {' · '}
                    <a href={person.site.url} rel="ugc" className="underline text-nb-ink">{person.site.title || person.site.address}</a>
                    {person.site.title && <> · {person.site.address}</>}
                  </>
                )}
              </div>
            </div>
            {person.site && viewerId && viewerId !== person.key && (
              <ReportButton reportType="site" targetId={person.site.id} reportedUserId={person.key} contentPreview={person.site.url} size="small" />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function RingStreetPage(props: RingStreetProps) {
  if (props.kind === 'unavailable') {
    return (
      <Layout>
        <PageMeta title="The ring street" noIndex />
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

  const { ring, homes, people, at, ringSigns, viewerId } = props
  const ringHref = `/tr/${encodeURIComponent(ring.slug)}`
  const count = homes.length

  return (
    <Layout>
      <PageMeta
        title={`${ring.name}'s street`}
        description={`The pixel homes of ${ring.name}'s members.`}
        path={`/neighborhood/ring/${encodeURIComponent(ring.slug)}`}
        image={ringShareImage(ring)}
      />
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

        {people.length > 0 && <People ring={ring} people={people} viewerId={viewerId} />}
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

  return {
    props: {
      kind: 'street',
      ring: street.ring,
      homes: street.homes,
      people: street.people,
      at,
      ringSigns,
      viewerId: viewer?.id ?? null,
    },
  }
}
