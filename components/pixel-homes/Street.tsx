import React, { useEffect } from 'react'
import Link from 'next/link'
import HouseSVG from './HouseSVG'
import type { StreetHome } from '@/lib/pixel-homes/street'

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
 */

// The window of the 512×352 scene shown per lot: the house (x 156–356,
// y 32–212) with a little yard around it
const LOT = { x: 112, y: 24, width: 288, height: 208 }
const HOUSE_IN_LOT = { x: 156 - LOT.x, y: 32 - LOT.y, width: 200, height: 180 }

interface StreetProps {
  homes: StreetHome[]
  /** Username to bring into view (e.g. coming back from their house) */
  at?: string | null
}

export default function Street({ homes, at }: StreetProps) {
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
            return (
              <li key={home.userId} id={`lot-${home.username}`} className="ts-street-lot">
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
            )
          })}
        </ol>
        <div className="ts-street-road" aria-hidden="true" />
      </div>
    </div>
  )
}
