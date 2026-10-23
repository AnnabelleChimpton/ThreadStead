import React, { useEffect } from 'react'
import Link from 'next/link'
import HouseSVG from './HouseSVG'
import type { StreetHome } from '@/lib/pixel-homes/street'
import type { RingSign } from '@/lib/pixel-homes/street-rings'
import ThreadRing88x31Badge from '@/components/core/threadring/ThreadRing88x31Badge'

/**
 * A street of pixel homes. Each lot is a 1x crop of the resident's yard
 * picture (the share snapshot's 512×352 card) around the house, so the art
 * stays crisp and the page doesn't ship every decoration's artwork. Homes
 * without a picture yet show just their house.
 *
 * Wide screens: lots side by side on a sidewalk, scrolling sideways.
 * Phones: lots stacked, scrolling down. Each lot is a plain link to the
 * house; its sign (number and name) is part of the ground, not a label on
 * the art.
 *
 * Between the lots stand ThreadRing signposts (lib/pixel-homes/street-
 * rings.ts): the ring's 88×31 badge on a post, and prev / random / next
 * through its member homes on the sidewalk below.
 */

// The window of the 512×352 scene shown per lot: the house (x 156–356,
// y 32–212) with a little yard around it
const LOT = { x: 112, y: 24, width: 288, height: 208 }
const HOUSE_IN_LOT = { x: 156 - LOT.x, y: 32 - LOT.y, width: 200, height: 180 }

interface StreetProps {
  homes: StreetHome[]
  /** Username to bring into view (e.g. coming back from their house) */
  at?: string | null
  /** Rings two or more of these residents belong to, each after its first member's lot */
  ringSigns?: RingSign[]
  /** Username whose house is being set down into its lot (signup's "Move in") */
  arriving?: string | null
}

const walkHref = (sign: RingSign, go: 'prev' | 'random' | 'next') =>
  `/neighborhood/walk?ring=${encodeURIComponent(sign.slug)}&from=${sign.afterNumber}&go=${go}`

function RingSignpost({ sign }: { sign: RingSign }) {
  return (
    <li className="ts-street-stop" aria-label={`${sign.name}, a ThreadRing`}>
      <span className="ts-street-stop-yard">
        <a href={`/tr/${encodeURIComponent(sign.slug)}`} className="ts-street-stop-board" title={sign.name}>
          {/* A ring with no badge of its own gets the default one */}
          <ThreadRing88x31Badge
            slug={sign.slug}
            title={sign.name}
            imageUrl={sign.badgeImageUrl ?? undefined}
          />
        </a>
        <span className="ts-street-stop-post" aria-hidden="true" />
      </span>
      <span className="ts-street-sign ts-street-stop-walk">
        <a href={walkHref(sign, 'prev')} aria-label={`Previous home in ${sign.name}`}>‹</a>
        <a href={walkHref(sign, 'random')} aria-label={`A random home in ${sign.name}`}>random</a>
        <a href={walkHref(sign, 'next')} aria-label={`Next home in ${sign.name}`}>›</a>
      </span>
    </li>
  )
}

export default function Street({ homes, at, ringSigns = [], arriving }: StreetProps) {
  useEffect(() => {
    if (!at) return
    const lot = document.getElementById(`lot-${at}`)
    lot?.scrollIntoView({ block: 'center', inline: 'center' })
  }, [at])

  if (homes.length === 0) {
    return <p className="text-nb-ink-mid">Nobody you can visit lives on this street yet.</p>
  }

  return (
    <div className="ts-street">
      <div className="ts-street-inner">
        <ol className="ts-street-lots">
          {homes.map((home) => {
            const name = home.displayName || home.username
            const signsHere = ringSigns.filter((sign) => sign.afterUserId === home.userId)
            return (
              <React.Fragment key={home.userId}>
                <li
                  id={`lot-${home.username}`}
                  className={home.username === arriving ? 'ts-street-lot ts-street-lot--arriving' : 'ts-street-lot'}
                >
                  <Link
                    href={`/home/${encodeURIComponent(home.username)}`}
                    className="ts-street-lot-link"
                    aria-label={`${home.number}, ${name}'s house`}
                  >
                    <span className="ts-street-yard" aria-hidden="true">
                      {home.snapshotCardUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={home.snapshotCardUrl}
                          alt=""
                          width={LOT.width}
                          height={LOT.height}
                          loading="lazy"
                          style={{
                            objectFit: 'none',
                            objectPosition: `-${LOT.x}px -${LOT.y}px`,
                            imageRendering: 'pixelated',
                          }}
                        />
                      ) : (
                        <span
                          className="absolute"
                          style={{ left: HOUSE_IN_LOT.x, top: HOUSE_IN_LOT.y, width: HOUSE_IN_LOT.width, height: HOUSE_IN_LOT.height }}
                        >
                          <HouseSVG
                            template={home.houseTemplate}
                            palette={home.palette}
                            customizations={home.houseCustomizations}
                            className="w-full h-full"
                          />
                        </span>
                      )}
                    </span>
                    <span className="ts-street-sign">
                      <span className="ts-street-number">{home.number}</span> {name}
                    </span>
                  </Link>
                </li>
                {signsHere.map((sign) => <RingSignpost key={sign.slug} sign={sign} />)}
              </React.Fragment>
            )
          })}
        </ol>
        <div className="ts-street-road" aria-hidden="true" />
      </div>
    </div>
  )
}
