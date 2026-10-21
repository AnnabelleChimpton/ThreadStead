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

/**
 * What each house palette swaps the key ramps for: a wall, roof, trim and
 * glass ramp from the master palette, dark to light (art-direction §3.2).
 * Every palette owns its walls, so switching palettes repaints most of the
 * house (design/starter-house-audit). A ramp that repeats its darkest step
 * uses it as the outline. Step 3 (index 2) is the colour the code-drawn
 * houses paint with; see HOUSE_PAINT.
 */
export const HOUSE_PALETTE_RAMPS: Record<string, HouseRamps> = {
  // Sage green walls, brown roof, pine trim
  thread_sage: {
    wall: [R.foliage[2], R.foliage[3], R.foliage[4], R.butter[2]],
    roof: [R.wood[0], R.wood[1], R.wood[2], R.wood[3]],
    trim: [R.pine[0], R.pine[0], R.pine[1], R.pine[2]],
    glass: [R.sky[0], R.sky[1], R.sky[2], R.sky[3]],
  },
  // Charcoal walls, slate roof, linen trim, lit windows
  charcoal_nights: {
    wall: [R.ink[0], R.ink[0], R.ink[1], R.ink[2]],
    roof: [R.ink[0], R.slate[0], R.slate[1], R.slate[2]],
    trim: [R.ink[2], R.ink[3], R.ink[4], R.ink[5]],
    glass: [R.butter[0], R.butter[1], R.butter[2], R.ink[5]],
  },
  // Rose walls, red roof, dark red trim
  pixel_petals: {
    wall: [R.rose[0], R.rose[0], R.rose[1], R.rose[2]],
    roof: [R.red[0], R.red[0], R.red[1], R.red[2]],
    trim: [R.ink[0], R.ink[1], R.red[0], R.rose[0]],
    glass: [R.sky[0], R.sky[1], R.sky[2], R.sky[3]],
  },
  // Lavender walls, dark roof, violet trim, green-screen windows
  crt_glow: {
    wall: [R.lavender[0], R.lavender[1], R.lavender[2], R.ink[5]],
    roof: [R.ink[0], R.ink[0], R.ink[1], R.ink[2]],
    trim: [R.ink[0], R.ink[0], R.lavender[0], R.lavender[1]],
    glass: [R.foliage[1], R.foliage[3], R.foliage[4], R.ink[5]],
  },
  // Linen walls, dark brown roof, white trim
  classic_linen: {
    wall: [R.ink[2], R.ink[3], R.ink[4], R.ink[5]],
    roof: [R.wood[0], R.wood[0], R.wood[1], R.wood[2]],
    trim: [R.ink[3], R.ink[4], R.ink[5], R.ink[5]],
    glass: [R.sky[0], R.sky[0], R.sky[1], R.sky[2]],
  },
}

/** Window glass at night, in every palette: lamplight. */
export const LIT_GLASS = R.butter[2]

/** The glass ramp at night (house sprites swap their glass key for it). */
export const LIT_GLASS_RAMP: HouseRamps['glass'] = [R.butter[0], R.butter[1], R.butter[2], R.ink[5]]

/** The one small accent each palette adds (the townhouse's corner stones). */
export const HOUSE_DETAIL_COLOURS: Record<string, string> = {
  thread_sage: R.wood[4],
  charcoal_nights: R.red[2],
  pixel_petals: R.foliage[3],
  crt_glow: R.pine[2],
  classic_linen: R.wood[2],
}

export interface HousePaint {
  wall: string
  roof: string
  trim: string
  glass: string
  detail: string
}

/** The flat colours a palette paints a code-drawn house with: step 3 of each ramp. */
export function housePaint(palette: string): HousePaint {
  const ramps = HOUSE_PALETTE_RAMPS[palette] ?? HOUSE_PALETTE_RAMPS.thread_sage
  return {
    wall: ramps.wall[2],
    roof: ramps.roof[2],
    trim: ramps.trim[2],
    glass: ramps.glass[2],
    detail: HOUSE_DETAIL_COLOURS[palette] ?? HOUSE_DETAIL_COLOURS.thread_sage,
  }
}
