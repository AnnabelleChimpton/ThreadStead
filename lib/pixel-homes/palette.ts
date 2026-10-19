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

/**
 * House layers are drawn in these key colours, one 4-step ramp (dark to
 * light) per part. They're deliberately loud so they never pass for real
 * colours. The same values are in design/pixel-art/_template-house.sockets.json.
 */
export const KEY_RAMPS = {
  wall: ['#500050', '#900090', '#d000d0', '#ff60ff'],
  roof: ['#005050', '#009090', '#00d0d0', '#60ffff'],
  trim: ['#505000', '#909000', '#d0d000', '#ffff60'],
  glass: ['#000050', '#000090', '#0000d0', '#6060ff'],
} as const

export type HousePart = keyof typeof KEY_RAMPS
export type HouseRamps = Record<HousePart, readonly [string, string, string, string]>

const R = PALETTE_RAMPS
const NEUTRAL_LIGHT = [R.ink[2], R.ink[3], R.ink[4], R.ink[5]] as const

/**
 * What each house palette swaps the key ramps for: a wall, roof, trim and
 * glass ramp from the master palette (art-direction §3.2). Three-step ramps
 * repeat their darkest step, which is the outline.
 */
export const HOUSE_PALETTE_RAMPS: Record<string, HouseRamps> = {
  thread_sage: {
    wall: NEUTRAL_LIGHT,
    roof: [R.wood[1], R.wood[2], R.wood[3], R.wood[4]],
    trim: [R.pine[0], R.pine[0], R.pine[1], R.pine[2]],
    glass: [R.sky[0], R.sky[1], R.sky[2], R.sky[3]],
  },
  charcoal_nights: {
    wall: NEUTRAL_LIGHT,
    roof: [R.ink[0], R.ink[0], R.ink[1], R.ink[2]],
    trim: [R.slate[0], R.slate[1], R.slate[2], R.slate[3]],
    glass: [R.red[0], R.red[1], R.red[2], R.red[3]],
  },
  pixel_petals: {
    wall: NEUTRAL_LIGHT,
    roof: [R.terracotta[0], R.terracotta[1], R.terracotta[2], R.terracotta[3]],
    trim: [R.foliage[0], R.foliage[1], R.foliage[2], R.foliage[3]],
    glass: [R.sky[0], R.sky[1], R.sky[2], R.sky[3]],
  },
  crt_glow: {
    wall: NEUTRAL_LIGHT,
    roof: [R.sky[0], R.sky[1], R.sky[2], R.sky[3]],
    trim: [R.ink[0], R.ink[1], R.ink[2], R.ink[3]],
    glass: [R.foliage[1], R.foliage[2], R.foliage[3], R.foliage[4]],
  },
  classic_linen: {
    wall: NEUTRAL_LIGHT,
    roof: [R.wood[1], R.wood[2], R.wood[3], R.wood[4]],
    trim: [R.wood[0], R.wood[1], R.wood[2], R.wood[3]],
    glass: [R.pine[0], R.pine[0], R.pine[1], R.pine[2]],
  },
}
