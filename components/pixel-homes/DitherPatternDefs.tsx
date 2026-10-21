import React from 'react'

/**
 * SVG Defs component providing dither patterns for pixel art rendering.
 * Include this in any SVG that needs dithered textures.
 */
interface DitherPatternDefsProps {
  /** Primary color for generating pattern variants */
  baseColor?: string
  /** Secondary/accent color for pattern details */
  accentColor?: string
  /** Unique prefix to avoid ID conflicts when multiple instances exist */
  prefix?: string
}

export default function DitherPatternDefs({
  baseColor = '#888888',
  accentColor = '#666666',
  prefix = ''
}: DitherPatternDefsProps) {
  const p = prefix ? `${prefix}-` : ''

  return (
    <defs>
      {/* Checkerboard - 50% dither */}
      <pattern id={`${p}dither-checkerboard`} width="2" height="2" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="1" height="1" fill={baseColor} />
        <rect x="1" y="0" width="1" height="1" fill={accentColor} />
        <rect x="0" y="1" width="1" height="1" fill={accentColor} />
        <rect x="1" y="1" width="1" height="1" fill={baseColor} />
      </pattern>

      {/* Bayer 4x4 - subtle gradient dither */}
      <pattern id={`${p}dither-bayer4x4`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="4" height="4" fill={baseColor} />
        <rect x="0" y="0" width="1" height="1" fill={accentColor} />
        <rect x="2" y="0" width="1" height="1" fill={accentColor} />
        <rect x="3" y="1" width="1" height="1" fill={accentColor} />
        <rect x="1" y="1" width="1" height="1" fill={accentColor} />
        <rect x="0" y="2" width="1" height="1" fill={accentColor} />
        <rect x="2" y="2" width="1" height="1" fill={accentColor} />
        <rect x="3" y="3" width="1" height="1" fill={accentColor} />
        <rect x="1" y="3" width="1" height="1" fill={accentColor} />
      </pattern>

      {/* Horizontal lines */}
      <pattern id={`${p}dither-hlines`} width="1" height="2" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="1" height="1" fill={baseColor} />
        <rect x="0" y="1" width="1" height="1" fill={accentColor} />
      </pattern>

      {/* Vertical lines */}
      <pattern id={`${p}dither-vlines`} width="2" height="1" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="1" height="1" fill={baseColor} />
        <rect x="1" y="0" width="1" height="1" fill={accentColor} />
      </pattern>

      {/* Brick pattern */}
      <pattern id={`${p}dither-brick`} width="8" height="6" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="8" height="6" fill={baseColor} />
        <rect x="0" y="2" width="8" height="1" fill={accentColor} />
        <rect x="0" y="5" width="8" height="1" fill={accentColor} />
        <rect x="4" y="0" width="1" height="3" fill={accentColor} />
        <rect x="0" y="3" width="1" height="3" fill={accentColor} />
      </pattern>

      {/* Stone pattern */}
      <pattern id={`${p}dither-stone`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="8" height="8" fill={baseColor} />
        <rect x="0" y="3" width="4" height="1" fill={accentColor} />
        <rect x="5" y="3" width="3" height="1" fill={accentColor} />
        <rect x="2" y="7" width="3" height="1" fill={accentColor} />
        <rect x="6" y="7" width="2" height="1" fill={accentColor} />
        <rect x="4" y="0" width="1" height="4" fill={accentColor} />
        <rect x="1" y="4" width="1" height="4" fill={accentColor} />
        <rect x="6" y="4" width="1" height="3" fill={accentColor} />
      </pattern>

      {/* Wood grain - horizontal planks */}
      <pattern id={`${p}dither-wood`} width="16" height="4" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="16" height="4" fill={baseColor} />
        <rect x="0" y="3" width="16" height="1" fill={accentColor} />
        <rect x="3" y="1" width="2" height="1" fill={accentColor} opacity="0.4" />
        <rect x="10" y="2" width="3" height="1" fill={accentColor} opacity="0.4" />
      </pattern>

      {/* Shingle pattern - for roofs */}
      <pattern id={`${p}dither-shingle`} width="8" height="4" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="8" height="4" fill={baseColor} />
        <rect x="0" y="3" width="8" height="1" fill={accentColor} />
        <rect x="4" y="0" width="1" height="4" fill={accentColor} opacity="0.5" />
        <rect x="0" y="1" width="1" height="2" fill={accentColor} opacity="0.3" />
      </pattern>

      {/* Diagonal stripes */}
      <pattern id={`${p}dither-diagonal`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="4" height="4" fill={baseColor} />
        <rect x="0" y="0" width="1" height="1" fill={accentColor} />
        <rect x="1" y="1" width="1" height="1" fill={accentColor} />
        <rect x="2" y="2" width="1" height="1" fill={accentColor} />
        <rect x="3" y="3" width="1" height="1" fill={accentColor} />
      </pattern>

      {/* Sparse dots - 25% dither */}
      <pattern id={`${p}dither-sparse`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="4" height="4" fill={baseColor} />
        <rect x="0" y="0" width="1" height="1" fill={accentColor} />
        <rect x="2" y="2" width="1" height="1" fill={accentColor} />
      </pattern>

      {/* Dense dots - 75% dither */}
      <pattern id={`${p}dither-dense`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="4" height="4" fill={accentColor} />
        <rect x="1" y="1" width="1" height="1" fill={baseColor} />
        <rect x="3" y="3" width="1" height="1" fill={baseColor} />
      </pattern>

      {/* Grass texture */}
      <pattern id={`${p}dither-grass`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="8" height="8" fill={baseColor} />
        <rect x="1" y="1" width="1" height="2" fill={accentColor} />
        <rect x="4" y="0" width="1" height="3" fill={accentColor} />
        <rect x="7" y="2" width="1" height="2" fill={accentColor} />
        <rect x="2" y="5" width="1" height="2" fill={accentColor} />
        <rect x="5" y="4" width="1" height="3" fill={accentColor} />
        <rect x="0" y="6" width="1" height="2" fill={accentColor} />
      </pattern>
    </defs>
  )
}

/**
 * Dither pattern types for gradient blending
 * - solid: 100% colorA
 * - sparse: 75% colorA, 25% colorB (4x4 pattern with 4 pixels of colorB)
 * - checker: 50% colorA, 50% colorB (classic checkerboard)
 * - dense: 25% colorA, 75% colorB (4x4 pattern with 4 pixels of colorA)
 */
type DitherType = 'solid' | 'sparse' | 'checker' | 'dense'

interface GradientStop {
  color: string
  ditherTo?: string // Color to dither towards (for transition bands)
  ditherType?: DitherType
}

/**
 * Helper component to generate a single dither pattern
 */
function DitherPattern({
  id,
  colorA,
  colorB,
  type
}: {
  id: string
  colorA: string
  colorB: string
  type: DitherType
}) {
  if (type === 'solid') {
    return (
      <pattern id={id} width="2" height="2" patternUnits="userSpaceOnUse">
        <rect width="2" height="2" fill={colorA} />
      </pattern>
    )
  }

  if (type === 'checker') {
    // 50/50 checkerboard
    return (
      <pattern id={id} width="2" height="2" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="1" height="1" fill={colorA} />
        <rect x="1" y="0" width="1" height="1" fill={colorB} />
        <rect x="0" y="1" width="1" height="1" fill={colorB} />
        <rect x="1" y="1" width="1" height="1" fill={colorA} />
      </pattern>
    )
  }

  if (type === 'sparse') {
    // 75% colorA, 25% colorB - 4x4 ordered dither
    return (
      <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill={colorA} />
        <rect x="0" y="0" width="1" height="1" fill={colorB} />
        <rect x="2" y="2" width="1" height="1" fill={colorB} />
        <rect x="0" y="2" width="1" height="1" fill={colorB} />
        <rect x="2" y="0" width="1" height="1" fill={colorB} />
      </pattern>
    )
  }

  if (type === 'dense') {
    // 25% colorA, 75% colorB - inverse of sparse
    return (
      <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill={colorB} />
        <rect x="0" y="0" width="1" height="1" fill={colorA} />
        <rect x="2" y="2" width="1" height="1" fill={colorA} />
        <rect x="0" y="2" width="1" height="1" fill={colorA} />
        <rect x="2" y="0" width="1" height="1" fill={colorA} />
      </pattern>
    )
  }

  return null
}

/**
 * Generates gradient patterns with large solid bands and thin dithered transitions.
 * Pattern structure: SOLID (large) → checker transition (thin) → SOLID (large) → ...
 * This creates clean gradients with subtle pixel-art style blending at edges.
 */
function GradientDitherPatterns({
  prefix,
  name,
  colors
}: {
  prefix: string
  name: string
  colors: string[]
}) {
  const patterns: React.ReactNode[] = []
  let patternIndex = 0

  for (let i = 0; i < colors.length; i++) {
    const colorA = colors[i]
    const colorB = colors[i + 1]

    // Main solid band of current color
    patterns.push(
      <DitherPattern
        key={`${name}-${patternIndex}`}
        id={`${prefix}${name}-${patternIndex}`}
        colorA={colorA}
        colorB={colorA}
        type="solid"
      />
    )
    patternIndex++

    // If there's a next color, add just one thin checker transition
    if (colorB) {
      patterns.push(
        <DitherPattern
          key={`${name}-${patternIndex}`}
          id={`${prefix}${name}-${patternIndex}`}
          colorA={colorA}
          colorB={colorB}
          type="checker"
        />
      )
      patternIndex++
    }
  }

  return <>{patterns}</>
}

export type SkyType = 'sunny' | 'cloudy' | 'sunset' | 'night'

// The yard's sky and lawn, from threadstead-44 (lib/pixel-homes/palette.ts),
// as in the art bible's design/pixel-art/_yard-preview.png. The street's lots
// and signposts (styles/components.css .ts-street-yard) use the same bands.

// Sky colours, from the top down to the horizon
const SKY_COLORS: Record<SkyType, string[]> = {
  sunny: ['#6f97b3', '#9dbfd3', '#d4e6ef'],
  cloudy: ['#8fa0a0', '#c5d0cd', '#d4e6ef'],
  sunset: ['#8b7fe0', '#d9a9b5', '#e27d60', '#f2c6a0'],
  night: ['#2b2523', '#3e4b4d', '#3f5f7a'],
}

// Lawn colours, from the horizon down to the foreground
const GROUND_COLORS = ['#a3c27a', '#608d43', '#49722e']

/** Height in pixels of the checker seam between two sky or lawn bands. */
export const SCENE_DITHER_SEAM = 2

/** Stars on the night sky, in sky coordinates: [x, y, size, colour]. */
export const NIGHT_STARS: ReadonlyArray<readonly [number, number, number, string]> = [
  [32, 16, 2, '#fffaf5'], [120, 32, 2, '#c5d0cd'], [200, 12, 2, '#fffaf5'], [350, 24, 2, '#d8cbbd'],
  [420, 48, 2, '#fffaf5'], [80, 60, 1, '#8fa0a0'], [280, 40, 1, '#c5d0cd'], [380, 8, 1, '#d8cbbd'],
]

// Stored atmosphere values aren't validated, so fall back to the sunny sky.
const skyColors = (sky: SkyType) => SKY_COLORS[sky] ?? SKY_COLORS.sunny

/** The sky's horizon colour, painted under the bands so nothing shows through a gap. */
export const skyBaseColor = (sky: SkyType): string => skyColors(sky)[skyColors(sky).length - 1]

/** The lawn's horizon colour, painted under the bands. */
export const groundBaseColor = (): string => GROUND_COLORS[0]

/**
 * Pattern definitions for one sky gradient: ids `${prefix}-sky-${sky}-${i}`.
 * Emit only the sky an SVG actually paints, once per SVG, with a prefix unique
 * to that SVG (useSvgIdPrefix) so two scenes on a page never share ids.
 */
export function SkyGradientDefs({ prefix = '', sky }: { prefix?: string; sky: SkyType }) {
  const p = prefix ? `${prefix}-` : ''
  return (
    <defs>
      <GradientDitherPatterns prefix={p} name={`sky-${sky}`} colors={skyColors(sky)} />
    </defs>
  )
}

/**
 * Pattern definitions for the lawn gradient: ids `${prefix}-ground-${i}`.
 */
export function GroundGradientDefs({ prefix = '' }: { prefix?: string }) {
  const p = prefix ? `${prefix}-` : ''
  return (
    <defs>
      <GradientDitherPatterns prefix={p} name="ground" colors={GROUND_COLORS} />
    </defs>
  )
}

/**
 * Returns the number of pattern bands for a given sky type.
 * Used by EnhancedHouseCanvas to know how many bands to render.
 */
export function getSkyPatternCount(skyType: SkyType): number {
  // Each color gets 1 solid band
  // Each transition between colors gets 1 checker band
  // Total = numColors + (numColors - 1) = numColors * 2 - 1
  return skyColors(skyType).length * 2 - 1
}

/**
 * Returns the number of pattern bands for the lawn gradient.
 */
export function getGroundPatternCount(): number {
  return GROUND_COLORS.length * 2 - 1
}

export interface DitherBand {
  index: number
  y: number
  height: number
}

/**
 * Lays out gradient bands in whole pixels. Even indexes are solid bands, odd
 * indexes are the checker transitions between them (see GradientDitherPatterns).
 *
 * Without `transitionHeight` every band gets an equal share of `height`. With
 * it, each transition is exactly that many pixels and the solid bands split
 * the rest, so the dither reads as a thin seam rather than a stripe.
 */
export function layoutDitherBands(patternCount: number, height: number, transitionHeight?: number): DitherBand[] {
  const transitions = Math.floor(patternCount / 2)
  const solids = patternCount - transitions
  const bands: DitherBand[] = []

  if (transitionHeight === undefined) {
    // Distribute extra pixels to the first N bands for even distribution
    const base = Math.floor(height / patternCount)
    const extra = height % patternCount
    let y = 0
    for (let i = 0; i < patternCount; i++) {
      const h = base + (i < extra ? 1 : 0)
      bands.push({ index: i, y, height: h })
      y += h
    }
    return bands
  }

  const solidSpace = Math.max(0, height - transitions * transitionHeight)
  const base = Math.floor(solidSpace / solids)
  const extra = solidSpace % solids
  let y = 0
  let solidIndex = 0
  for (let i = 0; i < patternCount; i++) {
    const isTransition = i % 2 === 1
    const h = isTransition ? transitionHeight : base + (solidIndex++ < extra ? 1 : 0)
    bands.push({ index: i, y, height: h })
    y += h
  }
  return bands
}

/**
 * Terrain tile dither patterns
 */
export function TerrainDitherDefs({ prefix = '' }: { prefix?: string }) {
  const p = prefix ? `${prefix}-` : ''

  return (
    <defs>
      {/* Dirt */}
      <pattern id={`${p}terrain-dirt`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#8B4513" />
        <rect x="0" y="0" width="1" height="1" fill="#6B3410" />
        <rect x="2" y="1" width="1" height="1" fill="#A0522D" />
        <rect x="1" y="3" width="1" height="1" fill="#6B3410" />
        <rect x="3" y="2" width="1" height="1" fill="#A0522D" />
      </pattern>

      {/* Stone path */}
      <pattern id={`${p}terrain-stone`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#808080" />
        <rect x="0" y="0" width="3" height="3" fill="#909090" />
        <rect x="4" y="1" width="3" height="2" fill="#707070" />
        <rect x="1" y="4" width="2" height="3" fill="#707070" />
        <rect x="5" y="5" width="3" height="2" fill="#909090" />
      </pattern>

      {/* Brick path */}
      <pattern id={`${p}terrain-brick`} width="8" height="6" patternUnits="userSpaceOnUse">
        <rect width="8" height="6" fill="#A52A2A" />
        <rect x="0" y="0" width="3" height="2" fill="#B83030" />
        <rect x="4" y="0" width="3" height="2" fill="#983030" />
        <rect x="0" y="2" width="8" height="1" fill="#6B1F1F" />
        <rect x="2" y="3" width="3" height="2" fill="#B83030" />
        <rect x="6" y="3" width="2" height="2" fill="#983030" />
        <rect x="0" y="5" width="8" height="1" fill="#6B1F1F" />
      </pattern>

      {/* Water */}
      <pattern id={`${p}terrain-water`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#4682B4" />
        <rect x="0" y="2" width="2" height="1" fill="#5A9ECF" />
        <rect x="4" y="0" width="3" height="1" fill="#5A9ECF" />
        <rect x="1" y="5" width="2" height="1" fill="#5A9ECF" />
        <rect x="6" y="6" width="2" height="1" fill="#5A9ECF" />
        <rect x="3" y="3" width="1" height="1" fill="#6BAFDF" />
        <rect x="7" y="4" width="1" height="1" fill="#6BAFDF" />
      </pattern>

      {/* Sand */}
      <pattern id={`${p}terrain-sand`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#F4A460" />
        <rect x="0" y="0" width="1" height="1" fill="#E8C080" />
        <rect x="2" y="2" width="1" height="1" fill="#E8C080" />
        <rect x="1" y="1" width="1" height="1" fill="#D49040" />
        <rect x="3" y="3" width="1" height="1" fill="#D49040" />
      </pattern>

      {/* Gravel */}
      <pattern id={`${p}terrain-gravel`} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#708090" />
        <rect x="0" y="0" width="2" height="2" fill="#808898" />
        <rect x="3" y="1" width="2" height="1" fill="#606878" />
        <rect x="1" y="3" width="1" height="2" fill="#606878" />
        <rect x="4" y="4" width="2" height="2" fill="#808898" />
      </pattern>

      {/* Flower bed */}
      <pattern id={`${p}terrain-flowerbed`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#3D2314" />
        <rect x="1" y="1" width="1" height="1" fill="#4D3324" />
        <rect x="4" y="2" width="1" height="1" fill="#4D3324" />
        <rect x="2" y="5" width="1" height="1" fill="#4D3324" />
        <rect x="6" y="6" width="1" height="1" fill="#4D3324" />
        <rect x="0" y="3" width="1" height="1" fill="#2D1304" />
        <rect x="5" y="0" width="1" height="1" fill="#2D1304" />
      </pattern>

      {/* Wood deck */}
      <pattern id={`${p}terrain-wood`} width="12" height="4" patternUnits="userSpaceOnUse">
        <rect width="12" height="4" fill="#A1887F" />
        <rect x="0" y="3" width="12" height="1" fill="#8B7060" />
        <rect x="2" y="1" width="2" height="1" fill="#8B7060" opacity="0.3" />
        <rect x="8" y="2" width="2" height="1" fill="#8B7060" opacity="0.3" />
      </pattern>

      {/* Cobblestone */}
      <pattern id={`${p}terrain-cobble`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#9E9E9E" />
        <rect x="0" y="0" width="3" height="3" fill="#AEAEAE" />
        <rect x="4" y="0" width="4" height="3" fill="#8E8E8E" />
        <rect x="0" y="4" width="4" height="4" fill="#8E8E8E" />
        <rect x="5" y="4" width="3" height="4" fill="#AEAEAE" />
        <rect x="3" y="0" width="1" height="8" fill="#7E7E7E" opacity="0.5" />
        <rect x="0" y="3" width="8" height="1" fill="#7E7E7E" opacity="0.5" />
      </pattern>
    </defs>
  )
}
