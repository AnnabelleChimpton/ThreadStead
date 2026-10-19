/**
 * The ThreadStead 44-colour master palette, ramps dark to light.
 * The same colours as design/pixel-art/threadstead-44.gpl (a test keeps the
 * two in step). The sprite upload checks art against it.
 */

export const PALETTE_RAMPS = {
  ink: ['#2b2523', '#4a403d', '#7a6c64', '#a8998e', '#d8cbbd', '#fffaf5'],
  slate: ['#3e4b4d', '#5c6e70', '#8fa0a0', '#c5d0cd'],
  sky: ['#3f5f7a', '#6f97b3', '#9dbfd3', '#d4e6ef'],
  wood: ['#3d2314', '#5c301b', '#834a27', '#b05e2b', '#e1b489'],
  terracotta: ['#a8634a', '#cd9d70', '#f2c6a0', '#ffe7cf'],
  foliage: ['#1b350a', '#2d5016', '#49722e', '#608d43', '#a3c27a'],
  pine: ['#1d3029', '#2e4b3f', '#4a957a'],
  red: ['#7f1d1d', '#c4473a', '#e27d60', '#f2a58e'],
  rose: ['#8c4a5b', '#d9a9b5', '#f4d6dc'],
  butter: ['#b07d1a', '#e8b730', '#f6e27f'],
  lavender: ['#5a4fb3', '#8b7fe0', '#c0b7f9'],
} as const

export type RampName = keyof typeof PALETTE_RAMPS

export const PALETTE_COLOURS: readonly string[] = Object.values(PALETTE_RAMPS).flat()

const PALETTE_SET = new Set(PALETTE_COLOURS)

/** `#rrggbb`, lowercase. */
export function isPaletteColour(hex: string): boolean {
  return PALETTE_SET.has(hex.toLowerCase())
}

/** Most colours one sprite should use (art bible). */
export const MAX_SPRITE_COLOURS = 16
