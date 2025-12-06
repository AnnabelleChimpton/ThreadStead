/**
 * Pixel Art Dither Patterns
 *
 * Provides SVG pattern definitions for authentic pixel art textures.
 * These patterns can be used as fills in SVG elements for retro-style dithering.
 */

export type DitherPatternId =
  | 'checkerboard'
  | 'bayer2x2'
  | 'bayer4x4'
  | 'horizontal_lines'
  | 'vertical_lines'
  | 'diagonal_lines'
  | 'brick'
  | 'stone'
  | 'wood_grain'
  | 'shingle'

export interface DitherPattern {
  id: DitherPatternId
  name: string
  width: number
  height: number
  // Returns SVG pattern content (the rects inside the pattern)
  getPattern: (color1: string, color2: string) => string
}

/**
 * Checkerboard dither pattern - classic 50% blend
 */
const checkerboard: DitherPattern = {
  id: 'checkerboard',
  name: 'Checkerboard',
  width: 2,
  height: 2,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="1" height="1" fill="${color1}" />
    <rect x="1" y="0" width="1" height="1" fill="${color2}" />
    <rect x="0" y="1" width="1" height="1" fill="${color2}" />
    <rect x="1" y="1" width="1" height="1" fill="${color1}" />
  `
}

/**
 * Bayer 2x2 ordered dither pattern
 */
const bayer2x2: DitherPattern = {
  id: 'bayer2x2',
  name: 'Bayer 2x2',
  width: 2,
  height: 2,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="1" height="1" fill="${color1}" />
    <rect x="1" y="0" width="1" height="1" fill="${color2}" />
    <rect x="0" y="1" width="1" height="1" fill="${color2}" />
    <rect x="1" y="1" width="1" height="1" fill="${color1}" />
  `
}

/**
 * Bayer 4x4 ordered dither pattern - more gradual blending
 */
const bayer4x4: DitherPattern = {
  id: 'bayer4x4',
  name: 'Bayer 4x4',
  width: 4,
  height: 4,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="4" height="4" fill="${color1}" />
    <rect x="0" y="0" width="1" height="1" fill="${color2}" />
    <rect x="2" y="0" width="1" height="1" fill="${color2}" />
    <rect x="3" y="1" width="1" height="1" fill="${color2}" />
    <rect x="1" y="1" width="1" height="1" fill="${color2}" />
    <rect x="0" y="2" width="1" height="1" fill="${color2}" />
    <rect x="2" y="2" width="1" height="1" fill="${color2}" />
    <rect x="3" y="3" width="1" height="1" fill="${color2}" />
    <rect x="1" y="3" width="1" height="1" fill="${color2}" />
  `
}

/**
 * Horizontal lines pattern
 */
const horizontalLines: DitherPattern = {
  id: 'horizontal_lines',
  name: 'Horizontal Lines',
  width: 1,
  height: 2,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="1" height="1" fill="${color1}" />
    <rect x="0" y="1" width="1" height="1" fill="${color2}" />
  `
}

/**
 * Vertical lines pattern
 */
const verticalLines: DitherPattern = {
  id: 'vertical_lines',
  name: 'Vertical Lines',
  width: 2,
  height: 1,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="1" height="1" fill="${color1}" />
    <rect x="1" y="0" width="1" height="1" fill="${color2}" />
  `
}

/**
 * Diagonal lines pattern (45 degrees)
 */
const diagonalLines: DitherPattern = {
  id: 'diagonal_lines',
  name: 'Diagonal Lines',
  width: 4,
  height: 4,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="4" height="4" fill="${color1}" />
    <rect x="0" y="0" width="1" height="1" fill="${color2}" />
    <rect x="1" y="1" width="1" height="1" fill="${color2}" />
    <rect x="2" y="2" width="1" height="1" fill="${color2}" />
    <rect x="3" y="3" width="1" height="1" fill="${color2}" />
  `
}

/**
 * Brick pattern for walls
 */
const brick: DitherPattern = {
  id: 'brick',
  name: 'Brick',
  width: 8,
  height: 6,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="8" height="6" fill="${color1}" />
    <rect x="0" y="2" width="8" height="1" fill="${color2}" />
    <rect x="0" y="5" width="8" height="1" fill="${color2}" />
    <rect x="4" y="0" width="1" height="3" fill="${color2}" />
    <rect x="0" y="3" width="1" height="3" fill="${color2}" />
  `
}

/**
 * Stone pattern for foundations/walls
 */
const stone: DitherPattern = {
  id: 'stone',
  name: 'Stone',
  width: 8,
  height: 8,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="8" height="8" fill="${color1}" />
    <rect x="0" y="3" width="4" height="1" fill="${color2}" />
    <rect x="5" y="3" width="3" height="1" fill="${color2}" />
    <rect x="2" y="7" width="3" height="1" fill="${color2}" />
    <rect x="6" y="7" width="2" height="1" fill="${color2}" />
    <rect x="4" y="0" width="1" height="4" fill="${color2}" />
    <rect x="1" y="4" width="1" height="4" fill="${color2}" />
    <rect x="6" y="4" width="1" height="3" fill="${color2}" />
  `
}

/**
 * Wood grain pattern for siding
 */
const woodGrain: DitherPattern = {
  id: 'wood_grain',
  name: 'Wood Grain',
  width: 16,
  height: 4,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="16" height="4" fill="${color1}" />
    <rect x="0" y="3" width="16" height="1" fill="${color2}" />
    <rect x="3" y="1" width="2" height="1" fill="${color2}" opacity="0.3" />
    <rect x="10" y="2" width="3" height="1" fill="${color2}" opacity="0.3" />
  `
}

/**
 * Shingle pattern for roofs
 */
const shingle: DitherPattern = {
  id: 'shingle',
  name: 'Shingle',
  width: 8,
  height: 4,
  getPattern: (color1, color2) => `
    <rect x="0" y="0" width="8" height="4" fill="${color1}" />
    <rect x="0" y="3" width="8" height="1" fill="${color2}" />
    <rect x="4" y="0" width="1" height="4" fill="${color2}" opacity="0.5" />
    <rect x="0" y="1" width="1" height="2" fill="${color2}" opacity="0.3" />
  `
}

/**
 * All available dither patterns
 */
export const ditherPatterns: Record<DitherPatternId, DitherPattern> = {
  checkerboard,
  bayer2x2,
  bayer4x4,
  horizontal_lines: horizontalLines,
  vertical_lines: verticalLines,
  diagonal_lines: diagonalLines,
  brick,
  stone,
  wood_grain: woodGrain,
  shingle,
}

/**
 * Generates SVG defs element containing all dither patterns
 * @param baseColor Primary color for patterns
 * @param accentColor Secondary color for pattern details
 * @returns SVG defs string
 */
export function generateDitherDefs(baseColor: string, accentColor: string): string {
  return Object.values(ditherPatterns)
    .map(pattern => `
      <pattern id="dither-${pattern.id}" width="${pattern.width}" height="${pattern.height}" patternUnits="userSpaceOnUse">
        ${pattern.getPattern(baseColor, accentColor)}
      </pattern>
    `)
    .join('\n')
}

/**
 * Get pattern URL for use in SVG fill attribute
 * @param patternId The pattern identifier
 * @returns CSS url() string for the pattern
 */
export function getPatternUrl(patternId: DitherPatternId): string {
  return `url(#dither-${patternId})`
}

/**
 * Darken a hex color by a specified amount
 */
export function darkenColor(color: string, amount: number = 20): string {
  if (!color.startsWith('#')) return color
  const r = Math.max(0, parseInt(color.substring(1, 3), 16) - amount)
  const g = Math.max(0, parseInt(color.substring(3, 5), 16) - amount)
  const b = Math.max(0, parseInt(color.substring(5, 7), 16) - amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Lighten a hex color by a specified amount
 */
export function lightenColor(color: string, amount: number = 20): string {
  if (!color.startsWith('#')) return color
  const r = Math.min(255, parseInt(color.substring(1, 3), 16) + amount)
  const g = Math.min(255, parseInt(color.substring(3, 5), 16) + amount)
  const b = Math.min(255, parseInt(color.substring(5, 7), 16) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
