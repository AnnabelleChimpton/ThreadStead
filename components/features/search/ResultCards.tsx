import Link from 'next/link'
import HouseSVG, { type ColorPalette, type HouseCustomizations, type HouseTemplate } from '@/components/pixel-homes/HouseSVG'
import { PixelIcon } from '@/components/ui/PixelIcon'
import type { HouseThumb, SearchResult } from '@/lib/search/types'

/**
 * One card shape per on-site result type on /search. Every card is a real
 * link that opens in the same tab. Indie Index sites: IndieSiteCard.
 */

export const ROW = 'ts-card-link flex items-start gap-3 p-3 rounded-cozy text-nb-ink hover:bg-nb-surface/60 focus-visible:bg-nb-surface/60'
export const TITLE = 'font-bold text-nb-ink underline decoration-nb-ink-mid/50 underline-offset-2 break-words'
export const META = 'text-sm text-nb-ink-mid'
export const BLURB = 'text-sm text-nb-ink mt-0.5 line-clamp-2 break-words'

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Under a home's title: whose it is, or the handle when the title already says so. */
export function homeSubtitle(title: string, home: { handle: string; ownerName: string }) {
  return title === `${home.ownerName}'s home` ? `@${home.handle}` : `${home.ownerName}'s home`
}

export function HouseThumbnail({ house, className = 'w-14 h-12' }: { house: HouseThumb; className?: string }) {
  return (
    <span className={`block shrink-0 ${className}`} aria-hidden="true">
      <HouseSVG
        template={house.template as HouseTemplate}
        palette={house.palette as ColorPalette}
        customizations={house.customizations as HouseCustomizations}
        variant="simplified"
        className="w-full h-full"
      />
    </span>
  )
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return <img src={src} alt="" width={40} height={40} loading="lazy" className="w-10 h-10 shrink-0 rounded-cozy border border-nb-ink-mid object-cover" />
  }
  return (
    <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-cozy border border-nb-ink-mid bg-nb-surface flex items-center justify-center font-bold text-nb-ink">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

export function PersonCard({ result }: { result: SearchResult }) {
  const p = result.person
  return (
    <Link href={result.url} className={ROW}>
      <Avatar src={p?.avatarUrl ?? null} name={result.title} />
      <span className="min-w-0 flex-1">
        <span className={TITLE}>{result.title}</span>
        <span className={`${META} block`}>
          {p ? `@${p.handle} · ${plural(p.postCount, 'post')}` : result.meta}
        </span>
        {result.description && <span className={`${BLURB} block`}>{result.description}</span>}
      </span>
      {p?.house && <HouseThumbnail house={p.house} />}
    </Link>
  )
}

export function RingCard({ result }: { result: SearchResult }) {
  const r = result.ring
  return (
    <Link href={result.url} className={ROW}>
      {r?.badgeImageUrl && (
        <img
          src={r.badgeImageUrl}
          alt=""
          width={88}
          height={31}
          loading="lazy"
          className="shrink-0 mt-0.5"
          style={{ imageRendering: 'pixelated', width: 88, height: 31 }}
        />
      )}
      <span className="min-w-0 flex-1">
        <span className={TITLE}>{result.title}</span>
        <span className={`${META} block`}>
          {r ? `${plural(r.memberCount, 'member')} · ${plural(r.postCount, 'post')}` : result.meta}
        </span>
        {result.description && <span className={`${BLURB} block`}>{result.description}</span>}
      </span>
    </Link>
  )
}

export function PostCard({ result }: { result: SearchResult }) {
  const p = result.post
  return (
    <Link href={result.url} className={ROW}>
      <span className="min-w-0 flex-1">
        <span className={TITLE}>{result.title}</span>
        <span className={`${META} block`}>
          {p ? (
            <>
              {p.authorName} · <time dateTime={p.createdAt}>{shortDate(p.createdAt)}</time>
              {p.ring && <> · in {p.ring.name}</>}
            </>
          ) : (
            result.meta
          )}
        </span>
        {result.description && <span className={`${BLURB} block`}>{result.description}</span>}
      </span>
    </Link>
  )
}

export function PlaceCard({ result }: { result: SearchResult }) {
  const h = result.home
  return (
    <Link href={result.url} className={ROW}>
      {h ? (
        <HouseThumbnail house={h.house} />
      ) : (
        <span aria-hidden="true" className="w-14 h-12 shrink-0 flex items-center justify-center text-nb-ink-mid">
          <PixelIcon name="file" size={24} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={TITLE}>{result.title}</span>
        <span className={`${META} block`}>{h ? homeSubtitle(result.title, h) : 'Site page'}</span>
        {result.description && <span className={`${BLURB} block`}>{result.description}</span>}
      </span>
    </Link>
  )
}

/** Picks the card for an on-site result. */
export function ResultCard({ result }: { result: SearchResult }) {
  switch (result.type) {
    case 'user':
      return <PersonCard result={result} />
    case 'threadring':
      return <RingCard result={result} />
    case 'post':
      return <PostCard result={result} />
    default:
      return <PlaceCard result={result} />
  }
}
