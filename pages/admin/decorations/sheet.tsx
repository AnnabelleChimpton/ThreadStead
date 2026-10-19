import React, { useState } from 'react'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import Layout from '@/components/ui/layout/Layout'
import AdminHeader from '@/components/ui/navigation/AdminHeader'
import DecorationSVG from '@/components/pixel-homes/DecorationSVG'
import HouseSVG, { type ColorPalette, type HouseTemplate } from '@/components/pixel-homes/HouseSVG'

interface Sprite {
  itemId: string
  name: string
  type: string
  category: string
  releaseType: string
  collection: string | null
  pngUrl: string
  width: number | null
  height: number | null
  frames: number
}

interface Props {
  sprites: Sprite[]
}

const TEMPLATES: HouseTemplate[] = ['cabin_v1', 'cottage_v1', 'townhouse_v1', 'loft_v1']
const PALETTES: ColorPalette[] = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen']

/** The lawn colour the yard draws today, and the foliage step the art bible proposes. */
const GRASS = { today: '#90EE90', palette: '#608d43' } as const

/**
 * Every active PNG sprite at 1× on one grass strip, grouped by category,
 * then the houses. A glance shows drift: a too-bright red, a sprite that
 * floats, one drawn at the wrong scale.
 */
export default function DecorationContactSheet({ sprites }: Props) {
  const [grass, setGrass] = useState<keyof typeof GRASS>('today')
  const [scale, setScale] = useState<1 | 2>(1)
  const groups = new Map<string, Sprite[]>()
  for (const sprite of sprites) groups.set(sprite.category, [...(groups.get(sprite.category) ?? []), sprite])

  return (
    <Layout fullWidth>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <AdminHeader current="decorations">
            <p>Contact sheet: {sprites.length} active sprites as residents see them, standing on one strip of grass.</p>
          </AdminHeader>
          <p className="mb-4 flex flex-wrap gap-4 text-sm">
            <Link href="/admin/decorations">All decorations</Link>
            <Link href="/admin/decorations/from-png">New from PNG</Link>
          </p>

          <div className="mb-4 flex flex-wrap gap-6 text-sm" role="group" aria-label="View">
            <fieldset className="flex gap-3 border-0 p-0 m-0">
              <legend className="sr-only">Grass</legend>
              <label><input type="radio" name="grass" checked={grass === 'today'} onChange={() => setGrass('today')} /> Today&rsquo;s grass</label>
              <label><input type="radio" name="grass" checked={grass === 'palette'} onChange={() => setGrass('palette')} /> Palette grass</label>
            </fieldset>
            <fieldset className="flex gap-3 border-0 p-0 m-0">
              <legend className="sr-only">Size</legend>
              <label><input type="radio" name="scale" checked={scale === 1} onChange={() => setScale(1)} /> 1×</label>
              <label><input type="radio" name="scale" checked={scale === 2} onChange={() => setScale(2)} /> 2×</label>
            </fieldset>
          </div>

          {sprites.length === 0 && <p>No active sprites have a PNG yet.</p>}

          <div className="thread-module overflow-x-auto pb-4">
            <div
              className="flex flex-wrap items-end"
              style={{ zoom: scale } as React.CSSProperties}
            >
              {[...groups].map(([category, items]) => (
                <React.Fragment key={category}>
                  {items.map((sprite) => (
                    <div
                      key={sprite.itemId}
                      title={`${sprite.itemId} (${sprite.category}${sprite.collection ? `, ${sprite.collection}` : ''}${sprite.releaseType !== 'PUBLIC' && sprite.releaseType !== 'DEFAULT' ? `, ${sprite.releaseType}` : ''})`}
                      className="flex items-end px-1"
                      style={{ borderBottom: `6px solid ${GRASS[grass]}`, minHeight: 104 }}
                    >
                      <DecorationSVG
                        decorationType={sprite.type as React.ComponentProps<typeof DecorationSVG>['decorationType']}
                        decorationId={sprite.itemId}
                        pngUrl={sprite.pngUrl}
                        pngWidth={sprite.width}
                        pngHeight={sprite.height}
                        pngFrames={sprite.frames}
                      />
                    </div>
                  ))}
                  <div aria-hidden="true" className="px-2" style={{ borderBottom: `6px solid ${GRASS[grass]}`, minHeight: 104 }} />
                </React.Fragment>
              ))}
            </div>
          </div>

          <details className="mt-4 text-sm">
            <summary>Which sprite is which</summary>
            <ul className="mt-2 columns-2 sm:columns-4 list-none p-0">
              {[...groups].map(([category, items]) => (
                <li key={category} className="mb-2 break-inside-avoid">
                  <strong>{category}</strong>
                  <ul className="list-none p-0">
                    {items.map((s) => (
                      <li key={s.itemId}>
                        <code>{s.itemId}</code>{s.width ? ` ${s.width}×${s.height}` : ''}{s.frames > 1 ? `, ${s.frames} frames` : ''}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </details>

          <h2 className="thread-headline text-lg font-bold mt-8 mb-2">Houses</h2>
          <div className="thread-module overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th />
                  {PALETTES.map((p) => <th key={p} className="px-2 text-xs font-normal">{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {TEMPLATES.map((t) => (
                  <tr key={t}>
                    <th className="pr-2 text-xs font-normal text-left">{t}</th>
                    {PALETTES.map((p) => (
                      <td key={p} className="p-1" style={{ borderBottom: `6px solid ${GRASS[grass]}` }}>
                        <div style={{ width: 200 * scale, height: 180 * scale }}>
                          <HouseSVG template={t} palette={p} className="h-full w-full" />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const user = await getSessionUser(context.req)
  if (user?.role !== 'admin') return { notFound: true }

  const sprites = await db.decorationItem.findMany({
    where: { isActive: true, pngUrl: { not: null } },
    select: {
      itemId: true, name: true, type: true, category: true, releaseType: true, collection: true,
      pngUrl: true, width: true, height: true, frames: true,
    },
    orderBy: [{ category: 'asc' }, { itemId: 'asc' }],
  })
  return { props: { sprites: sprites as Sprite[] } }
}
