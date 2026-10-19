/**
 * The share snapshot: a PNG of a resident's yard, drawn on the server from
 * the same art the live canvas uses. Server-only.
 *
 *   const { og, card } = await renderHomeSnapshot(scene, { loadImage })
 *
 * The scene is laid out as one SVG in canvas units (the 512×352 yard of
 * EnhancedHouseCanvas), rasterised ONCE at 1×, and then only cropped and
 * scaled by whole numbers with nearest-neighbour, so every art pixel stays a
 * crisp square:
 *
 *  - og    1200×630, for og:image / twitter:image. The yard at 2×, with the
 *          sky and grass carried on past its sides (600 canvas units wide)
 *          and 315 units of its height, centred on what's in the yard.
 *  - card  512×352, the whole yard at 1× (for grid cards and search
 *          thumbnails; scale it up with `image-rendering: pixelated`).
 *
 * The art isn't forked: the house is HouseSVG, sky/grass/terrain are the
 * DitherPatternDefs patterns, decorations are DecorationSVG (code-drawn) or
 * her PNGs, fetched and resized with nearest-neighbour to the size the
 * canvas shows them at. What IS mirrored here is EnhancedHouseCanvas's
 * layout (zone sizes, the house's spot, how a decoration sits in its box);
 * those numbers are below, and the snapshot tests pin the result.
 */
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import HouseSVG from '@/components/pixel-homes/HouseSVG'
import DecorationSVG from '@/components/pixel-homes/DecorationSVG'
import {
  GrassTextureDefs,
  GroundGradientDefs,
  SkyGradientDefs,
  TerrainDitherDefs,
  getGroundPatternCount,
  getSkyPatternCount,
  layoutDitherBands,
  type SkyType,
} from '@/components/pixel-homes/DitherPatternDefs'
import { PlantSVGs } from '@/components/pixel-homes/assets/PlantSVGs'
import { PathSVGs } from '@/components/pixel-homes/assets/PathSVGs'
import { FeatureSVGs } from '@/components/pixel-homes/assets/FeatureSVGs'
import { FurnitureSVGs } from '@/components/pixel-homes/assets/FurnitureSVGs'
import { LightingSVGs } from '@/components/pixel-homes/assets/LightingSVGs'
import { WaterSVGs } from '@/components/pixel-homes/assets/WaterSVGs'
import { StructureSVGs } from '@/components/pixel-homes/assets/StructureSVGs'
import { SeasonalSVGs } from '@/components/pixel-homes/assets/SeasonalSVGs'
import { HouseCustomSVGs } from '@/components/pixel-homes/assets/HouseCustomSVGs'
import { TERRAIN_TILES, isFlipped } from '@/lib/pixel-homes/decoration-data'
import { DEFAULT_DECORATION_GRID } from '@/lib/pixel-homes/decoration-grid-utils'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'
import { decorationText, type HomeScene, type SceneDecoration } from '@/lib/pixel-homes/home-scene'
import { decorationDepth, houseDepth } from '@/lib/pixel-homes/depth'

// --- EnhancedHouseCanvas's layout, in canvas units --------------------------
export const CANVAS_WIDTH = 512
export const CANVAS_HEIGHT = 352
const SKY_HEIGHT = 96 // background zone: y 0–96
const HOUSE = { x: 156, y: 32, width: 200, height: 180 }
const BASE_SKY_COLORS: Record<string, string> = {
  sunny: '#C8F0FF',
  cloudy: '#E0E8F0',
  sunset: '#FFD090',
  night: '#1A1A60',
}
const BASE_GRASS_COLOR = '#90EE90'
const TERRAIN_PATTERNS: Record<string, string> = {
  dirt: 'terrain-dirt',
  stone_path: 'terrain-stone',
  brick_path: 'terrain-brick',
  water: 'terrain-water',
  sand: 'terrain-sand',
  gravel: 'terrain-gravel',
  flower_bed: 'terrain-flowerbed',
  wood_deck: 'terrain-wood',
  cobblestone: 'terrain-cobble',
  mulch: 'terrain-dirt',
  moss: 'terrain-flowerbed',
  pebbles: 'terrain-gravel',
}
const SIZE_SCALES: Record<string, number> = { small: 0.7, medium: 1.0, large: 1.4 }
const NIGHT_STARS: Array<[number, number, number, number]> = [
  [32, 16, 2, 0.8], [120, 32, 2, 0.6], [200, 12, 2, 0.9], [350, 24, 2, 0.7],
  [420, 48, 2, 0.8], [80, 60, 1, 0.5], [280, 40, 1, 0.6], [380, 8, 1, 0.7],
]

// --- The share image ----------------------------------------------------------
export const OG_SIZE = { width: 1200, height: 630 } as const
export const CARD_SIZE = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT } as const
const OG_SCALE = 2
/** Canvas units of sky and grass carried past each side of the yard. */
const OG_PAD_X = (OG_SIZE.width / OG_SCALE - CANVAS_WIDTH) / 2 // 44
const OG_ROWS = OG_SIZE.height / OG_SCALE // 315 of the 352 rows
/** Never crop more than this off the top, so the roof always shows. */
const MAX_TOP_CROP = 30

/** Bump when the drawing changes, so the backfill re-renders every home. */
// 2: the house sorts with the decorations by depth (lib/pixel-homes/depth.ts)
// 3: flipped decorations are drawn mirrored
export const SNAPSHOT_RENDERER_VERSION = 3

/** Fetch an image's bytes, or null if it can't be had (a 404, an origin we don't fetch from). */
export type ImageLoader = (url: string) => Promise<Buffer | null>

export interface HomeSnapshot {
  og: Buffer
  card: Buffer
}

type AssetSvgProps = { id: string; variant: string; scale: number; className?: string; text?: string }
const FALLBACK_SVGS: Record<string, React.ComponentType<AssetSvgProps>> = {
  plant: PlantSVGs,
  path: PathSVGs,
  feature: FeatureSVGs,
  furniture: FurnitureSVGs,
  lighting: LightingSVGs,
  water: WaterSVGs,
  structure: StructureSVGs,
  seasonal: SeasonalSVGs,
  house_custom: HouseCustomSVGs,
}

function baseDecorationId(item: SceneDecoration): string {
  return item.decorationId || item.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')
}

function sizeOf(item: SceneDecoration): 'small' | 'medium' | 'large' {
  return (item.size as 'small' | 'medium' | 'large') || 'medium'
}

function decodeHtmlAttr(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function attr(markup: string, name: string): string | null {
  const open = markup.slice(0, markup.indexOf('>') + 1)
  const match = open.match(new RegExp(`\\s${name}="([^"]*)"`))
  return match ? decodeHtmlAttr(match[1]) : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** A PNG, resized with nearest-neighbour to exactly width×height, as a data: URI. */
async function pixelPng(bytes: Buffer, width: number, height: number): Promise<string> {
  const png = await sharp(bytes)
    .resize(width, height, { kernel: 'nearest', fit: 'fill' })
    .png()
    .toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

function imageMarkup(href: string, x: number, y: number, width: number, height: number): string {
  return `<image x="${round2(x)}" y="${round2(y)}" width="${width}" height="${height}" preserveAspectRatio="none" style="image-rendering:pixelated" xlink:href="${href}"/>`
}

/** Place a code-drawn SVG the way the canvas does: bottom-centred in its box. */
function svgMarkup(markup: string, left: number, top: number, boxWidth: number, boxHeight: number): string {
  const width = parseFloat(attr(markup, 'width') ?? '') || boxWidth
  const height = parseFloat(attr(markup, 'height') ?? '') || boxHeight
  const x = left + (boxWidth - width) / 2
  const y = top + (boxHeight - height)
  return `<g transform="translate(${round2(x)} ${round2(y)})">${markup}</g>`
}

/**
 * One placed decoration as SVG markup, in canvas units. Mirrors the canvas:
 * a box of getDecorationDimensions() at the stored position, the art
 * bottom-aligned and centred in it.
 */
async function decorationMarkup(item: SceneDecoration, loadImage: ImageLoader): Promise<string> {
  const id = baseDecorationId(item)
  const size = sizeOf(item)
  const box = getDecorationDimensions(item.decorationId || item.id, item.type, size)
  const left = item.position?.x || 0
  const top = item.position?.y || 0

  // A resident's own upload: natural size, shrunk to fit a 64×scale square,
  // centred in that square (DecorationSVG's 'custom' case).
  if (item.type === 'custom' && item.customAssetUrl) {
    const bytes = await loadImage(item.customAssetUrl)
    if (!bytes) return ''
    const meta = await sharp(bytes).metadata()
    const square = 64 * (SIZE_SCALES[size] ?? 1)
    const natural = { width: meta.width ?? square, height: meta.height ?? square }
    const fit = Math.min(1, square / natural.width, square / natural.height)
    const width = Math.max(1, Math.round(natural.width * fit))
    const height = Math.max(1, Math.round(natural.height * fit))
    const squareLeft = left + (box.width - square) / 2
    const squareTop = top + (box.height - square)
    const x = Math.round(squareLeft + (square - width) / 2)
    const y = Math.round(squareTop + (square - height) / 2)
    return imageMarkup(await pixelPng(bytes, width, height), x, y, width, height)
  }

  // React 19 puts a <link rel="preload"> in front of an <img>; only the art matters here.
  const markup = renderToStaticMarkup(
    <DecorationSVG
      decorationType={item.type as React.ComponentProps<typeof DecorationSVG>['decorationType']}
      decorationId={id}
      variant={item.variant}
      size={size}
      renderSvg={item.renderSvg}
      text={decorationText(item)}
      customAssetUrl={item.customAssetUrl}
      pngUrl={item.pngUrl ?? undefined}
    />
  ).replace(/^(?:<link\b[^>]*>)+/, '')

  // Her hand-drawn PNG: stretched to the box, as the canvas's <img> is.
  if (markup.startsWith('<img')) {
    const src = attr(markup, 'src')
    const bytes = src ? await loadImage(src) : null
    if (bytes) {
      return imageMarkup(await pixelPng(bytes, box.width, box.height), left, top, box.width, box.height)
    }
    // The canvas falls back to the code-drawn version when a PNG won't load.
    const Fallback = FALLBACK_SVGS[item.type]
    if (!Fallback) return ''
    const fallback = renderToStaticMarkup(
      <Fallback id={id} variant={item.variant || 'default'} scale={SIZE_SCALES[size] ?? 1} text={decorationText(item)} />
    )
    return svgMarkup(fallback, left, top, box.width, box.height)
  }

  if (!markup.startsWith('<svg')) return ''
  return svgMarkup(markup, left, top, box.width, box.height)
}

function Backdrop({ sky, padX }: { sky: SkyType; padX: number }) {
  const width = CANVAS_WIDTH + padX * 2
  const groundHeight = CANVAS_HEIGHT - SKY_HEIGHT
  const halfGround = Math.floor(groundHeight / 2)
  const skyBands = layoutDitherBands(getSkyPatternCount(sky), SKY_HEIGHT)
  const groundBands = layoutDitherBands(getGroundPatternCount(), groundHeight)
  // Each layer keeps the canvas's own origin (the sky and terrain at 0,0,
  // the ground at 0,96), so the dither patterns line up pixel for pixel.
  return (
    <>
      <g>
        <SkyGradientDefs prefix="snap" sky={sky} />
        <rect x={-padX} y={0} width={width} height={SKY_HEIGHT} fill={BASE_SKY_COLORS[sky] || '#87CEEB'} />
        {skyBands.map((band) => (
          <rect key={band.index} x={-padX} y={band.y} width={width} height={band.height} fill={`url(#snap-sky-${sky}-${band.index})`} />
        ))}
        {sky === 'night' &&
          NIGHT_STARS.map(([x, y, s, opacity]) => (
            <rect key={`${x},${y}`} x={x} y={y} width={s} height={s} fill="#FFFFFF" opacity={opacity} />
          ))}
      </g>
      <g transform={`translate(0 ${SKY_HEIGHT})`}>
        <GroundGradientDefs prefix="snap" />
        <GrassTextureDefs prefix="snap" />
        <rect x={-padX} y={0} width={width} height={groundHeight} fill={BASE_GRASS_COLOR} />
        {groundBands.map((band) => (
          <rect key={band.index} x={-padX} y={band.y} width={width} height={band.height} fill={`url(#snap-ground-${band.index})`} />
        ))}
        <rect x={-padX} y={0} width={width} height={halfGround} fill="url(#snap-grass-blades)" />
        <rect x={-padX} y={halfGround} width={width} height={groundHeight - halfGround} fill="url(#snap-grass-blades-dense)" />
      </g>
    </>
  )
}

function Terrain({ terrain }: { terrain: Record<string, string> }) {
  const cell = DEFAULT_DECORATION_GRID.cellSize
  return (
    <g>
      <TerrainDitherDefs prefix="snap" />
      {Object.entries(terrain).map(([key, tileId]) => {
        if (tileId === 'grass') return null // already the ground
        const tile = TERRAIN_TILES.find((t) => t.id === tileId)
        if (!tile) return null
        const [gridX, gridY] = key.split(',').map(Number)
        if (!Number.isFinite(gridX) || !Number.isFinite(gridY)) return null
        const pattern = TERRAIN_PATTERNS[tileId]
        // +1 overlaps neighbouring tiles to hide seams, as the canvas does
        return (
          <rect
            key={key}
            x={gridX * cell}
            y={gridY * cell}
            width={cell + 1}
            height={cell + 1}
            fill={pattern ? `url(#snap-${pattern})` : tile.color}
          />
        )
      })}
    </g>
  )
}

/** A flipped decoration, mirrored about the middle of its box (the canvas flips its art in place). */
async function mirrored(item: SceneDecoration, markup: Promise<string>): Promise<string> {
  const art = await markup
  if (!art || !isFlipped(item)) return art
  const box = getDecorationDimensions(item.decorationId || item.id, item.type, sizeOf(item))
  const centreTwice = 2 * (item.position?.x || 0) + box.width
  return `<g transform="translate(${round2(centreTwice)} 0) scale(-1 1)">${art}</g>`
}

/**
 * The scene as one SVG document in canvas units. `padX` carries the sky and
 * grass that many units past each side of the yard.
 */
export async function renderSceneSvg(
  scene: HomeScene,
  { loadImage, padX = 0 }: { loadImage: ImageLoader; padX?: number }
): Promise<string> {
  const width = CANVAS_WIDTH + padX * 2
  const background = renderToStaticMarkup(
    <>
      <Backdrop sky={scene.sky} padX={padX} />
      <Terrain terrain={scene.terrain} />
    </>
  )
  const house = renderToStaticMarkup(
    <svg x={HOUSE.x} y={HOUSE.y} width={HOUSE.width} height={HOUSE.height} viewBox={`0 0 ${HOUSE.width} ${HOUSE.height}`}>
      <HouseSVG template={scene.template} palette={scene.palette} customizations={scene.houseCustomizations} />
    </svg>
  )

  // The house and the decorations in one depth order, as the canvas stacks
  // them; equal depths keep their load order (the DOM order).
  const ordered = [
    { depth: houseDepth(), index: -1, item: null as SceneDecoration | null },
    ...scene.decorations.map((item, index) => ({ depth: decorationDepth(item), index, item })),
  ].sort((a, b) => a.depth - b.depth || a.index - b.index)
  const decorations = await Promise.all(
    ordered.map(({ item }) => (item ? mirrored(item, decorationMarkup(item, loadImage)) : Promise.resolve(house)))
  )

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` width="${width}" height="${CANVAS_HEIGHT}" viewBox="${-padX} 0 ${width} ${CANVAS_HEIGHT}"` +
    ` shape-rendering="crispEdges">` +
    background +
    decorations.join('') +
    `</svg>`
  )
}

/**
 * Which 315 of the 352 rows the share image shows: centred on the house and
 * decorations, never cropping more than MAX_TOP_CROP off the top.
 */
export function ogCropTop(scene: HomeScene): number {
  let contentTop = HOUSE.y
  let contentBottom = HOUSE.y + HOUSE.height
  for (const item of scene.decorations) {
    const box = getDecorationDimensions(item.decorationId || item.id, item.type, sizeOf(item))
    const y = item.position?.y || 0
    contentTop = Math.min(contentTop, Math.max(0, y))
    contentBottom = Math.max(contentBottom, Math.min(CANVAS_HEIGHT, y + box.height))
  }
  const centred = Math.round((contentTop + contentBottom) / 2 - OG_ROWS / 2)
  return Math.min(Math.max(centred, 0), Math.min(MAX_TOP_CROP, CANVAS_HEIGHT - OG_ROWS))
}

/** Draw the share image and the card for one yard. */
export async function renderHomeSnapshot(scene: HomeScene, { loadImage }: { loadImage: ImageLoader }): Promise<HomeSnapshot> {
  const svg = await renderSceneSvg(scene, { loadImage, padX: OG_PAD_X })
  // The only rasterisation: 1 canvas unit = 1 pixel.
  const raster = await sharp(Buffer.from(svg)).png().toBuffer()

  const [og, card] = await Promise.all([
    sharp(raster)
      .extract({ left: 0, top: ogCropTop(scene), width: OG_SIZE.width / OG_SCALE, height: OG_ROWS })
      .resize(OG_SIZE.width, OG_SIZE.height, { kernel: 'nearest' })
      .png({ compressionLevel: 9 })
      .toBuffer(),
    sharp(raster)
      .extract({ left: OG_PAD_X, top: 0, width: CARD_SIZE.width, height: CARD_SIZE.height })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ])
  return { og, card }
}
