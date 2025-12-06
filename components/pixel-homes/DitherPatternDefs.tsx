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

/**
 * Generates SVG pattern definitions for sky gradients with proper dithering.
 * Creates smooth color transitions using checkerboard dithering between adjacent colors.
 */
export function SkyDitherDefs({ prefix = '' }: { prefix?: string }) {
  const p = prefix ? `${prefix}-` : ''

  // Sky color palettes - from top (darker) to horizon (lighter)
  const skyColors = {
    sunny: ['#5BA3D0', '#6BB5DC', '#87CEEB', '#A8E4F0', '#C8F0FF'],
    cloudy: ['#8899AA', '#9DAAB8', '#B0C4DE', '#C8D4E8', '#E0E8F0'],
    sunset: ['#4A3070', '#7B4090', '#C85A80', '#FF7060', '#FFB060', '#FFD090'],
    night: ['#050510', '#0A0A20', '#101035', '#151550', '#1A1A60']
  }

  // Ground/grass colors - from light (top/horizon) to darker (bottom/foreground)
  const groundColors = ['#90EE90', '#7CCD7C', '#68B868', '#54A454', '#408040', '#2C6C2C']

  return (
    <defs>
      {/* Sky gradients */}
      <GradientDitherPatterns prefix={p} name="sky-sunny" colors={skyColors.sunny} />
      <GradientDitherPatterns prefix={p} name="sky-cloudy" colors={skyColors.cloudy} />
      <GradientDitherPatterns prefix={p} name="sky-sunset" colors={skyColors.sunset} />
      <GradientDitherPatterns prefix={p} name="sky-night" colors={skyColors.night} />

      {/* Ground gradient */}
      <GradientDitherPatterns prefix={p} name="ground" colors={groundColors} />
    </defs>
  )
}

/**
 * Returns the number of pattern bands for a given sky type.
 * Used by EnhancedHouseCanvas to know how many bands to render.
 */
export function getSkyPatternCount(skyType: 'sunny' | 'cloudy' | 'sunset' | 'night'): number {
  // Each color gets 1 solid band
  // Each transition between colors gets 1 checker band
  // Total = numColors + (numColors - 1) = numColors * 2 - 1
  const colorCounts = {
    sunny: 5,
    cloudy: 5,
    sunset: 6,
    night: 5
  }
  const numColors = colorCounts[skyType]
  return numColors * 2 - 1
}

/**
 * Returns the number of pattern bands for the ground gradient.
 */
export function getGroundPatternCount(): number {
  const numColors = 6 // groundColors length
  return numColors * 2 - 1
}

/**
 * Grass texture pattern definitions - adds blade details on top of color bands
 */
export function GrassTextureDefs({ prefix = '' }: { prefix?: string }) {
  const p = prefix ? `${prefix}-` : ''

  return (
    <defs>
      {/* Grass blade texture - scattered vertical lines */}
      <pattern id={`${p}grass-blades`} width="16" height="12" patternUnits="userSpaceOnUse">
        {/* Darker grass blade hints */}
        <rect x="1" y="4" width="1" height="3" fill="rgba(0,80,0,0.25)" />
        <rect x="4" y="2" width="1" height="4" fill="rgba(0,80,0,0.2)" />
        <rect x="7" y="5" width="1" height="3" fill="rgba(0,80,0,0.25)" />
        <rect x="10" y="1" width="1" height="4" fill="rgba(0,80,0,0.15)" />
        <rect x="13" y="3" width="1" height="4" fill="rgba(0,80,0,0.2)" />
        <rect x="3" y="8" width="1" height="3" fill="rgba(0,80,0,0.2)" />
        <rect x="8" y="9" width="1" height="2" fill="rgba(0,80,0,0.25)" />
        <rect x="12" y="7" width="1" height="4" fill="rgba(0,80,0,0.15)" />
        <rect x="15" y="6" width="1" height="3" fill="rgba(0,80,0,0.2)" />
        {/* Lighter highlight blades */}
        <rect x="2" y="6" width="1" height="2" fill="rgba(180,255,180,0.2)" />
        <rect x="6" y="3" width="1" height="3" fill="rgba(180,255,180,0.15)" />
        <rect x="11" y="5" width="1" height="2" fill="rgba(180,255,180,0.2)" />
        <rect x="14" y="9" width="1" height="2" fill="rgba(180,255,180,0.15)" />
      </pattern>

      {/* Denser grass for foreground areas */}
      <pattern id={`${p}grass-blades-dense`} width="12" height="10" patternUnits="userSpaceOnUse">
        <rect x="0" y="2" width="1" height="4" fill="rgba(0,60,0,0.3)" />
        <rect x="2" y="0" width="1" height="5" fill="rgba(0,60,0,0.25)" />
        <rect x="4" y="3" width="1" height="4" fill="rgba(0,60,0,0.3)" />
        <rect x="6" y="1" width="1" height="5" fill="rgba(0,60,0,0.2)" />
        <rect x="8" y="2" width="1" height="4" fill="rgba(0,60,0,0.25)" />
        <rect x="10" y="0" width="1" height="5" fill="rgba(0,60,0,0.3)" />
        <rect x="1" y="6" width="1" height="3" fill="rgba(0,60,0,0.25)" />
        <rect x="3" y="5" width="1" height="4" fill="rgba(0,60,0,0.2)" />
        <rect x="5" y="7" width="1" height="3" fill="rgba(0,60,0,0.3)" />
        <rect x="7" y="6" width="1" height="3" fill="rgba(0,60,0,0.25)" />
        <rect x="9" y="5" width="1" height="4" fill="rgba(0,60,0,0.2)" />
        <rect x="11" y="7" width="1" height="3" fill="rgba(0,60,0,0.25)" />
        {/* Highlights */}
        <rect x="3" y="1" width="1" height="2" fill="rgba(200,255,200,0.2)" />
        <rect x="7" y="4" width="1" height="2" fill="rgba(200,255,200,0.15)" />
        <rect x="11" y="2" width="1" height="2" fill="rgba(200,255,200,0.2)" />
      </pattern>
    </defs>
  )
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
