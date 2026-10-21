/**
 * Houses drawn as PNG layers (art-direction T14, §5.3).
 *
 * A template is a stack on a 200×180 canvas: a `base` layer (walls,
 * foundation, ground line) and a `roof` layer, plus option sprites that
 * drop into named sockets (door, windows, chimney…). Layers are drawn in
 * the KEY_RAMPS colours; swapKeyColours() turns them into the palette a
 * resident picked, so one drawing covers every palette.
 *
 * Nothing switches until a template's art exists here AND the template is
 * listed in NEXT_PUBLIC_HOUSE_SPRITES. Until then every house is HouseSVG.
 */
import sockets from '../../design/pixel-art/_template-house.sockets.json'
import { HOUSE_PALETTE_RAMPS, KEY_RAMPS, LIT_GLASS_RAMP, type HousePart } from './palette'

export interface SocketBox {
  x: number
  y: number
  w: number
  h: number
}

export interface HouseLayerSet {
  /** Full 200×180 layers, drawn bottom to top */
  layers: { base: string; roof: string }
  /** Option sprites by name ("door-arched", "window-round"), each the size of its socket */
  options: Record<string, string>
  /** A stand-in made from the code-drawn house, for testing the renderer */
  placeholder?: boolean
}

export const HOUSE_SIZE = { width: 200, height: 180 } as const

/** Socket boxes per template, from design/pixel-art/_template-house.sockets.json. */
export const HOUSE_SOCKETS: Record<string, Record<string, SocketBox>> = {
  cabin_v1: sockets.cabin.sockets,
}

/**
 * The layer art per template. Empty until the redraw lands; the placeholder
 * is only used where something asks for it by name (admin previews, tests).
 */
export const HOUSE_LAYER_SETS: Record<string, HouseLayerSet> = {}

export const PLACEHOLDER_LAYER_SETS: Record<string, HouseLayerSet> = {
  cabin_v1: {
    layers: {
      base: '/pixel-homes/house-layers/placeholder/cabin_base.png',
      roof: '/pixel-homes/house-layers/placeholder/cabin_roof.png',
    },
    options: {},
    placeholder: true,
  },
}

/** Templates switched on with NEXT_PUBLIC_HOUSE_SPRITES ("cabin_v1,cottage_v1"). */
export function enabledHouseSpriteTemplates(flag: string | undefined = process.env.NEXT_PUBLIC_HOUSE_SPRITES): Set<string> {
  return new Set((flag ?? '').split(',').map((t) => t.trim()).filter(Boolean))
}

/** The layer set to draw for a template, or null to keep HouseSVG. */
export function houseLayerSet(template: string, flag?: string): HouseLayerSet | null {
  if (!enabledHouseSpriteTemplates(flag).has(template)) return null
  return HOUSE_LAYER_SETS[template] ?? null
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]
const rgbKey = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b

/** Key colour (as 0xRRGGBB) → the palette's colour, for every step of every part. */
export function keyColourMap(palette: string, lit = false): Map<number, [number, number, number]> {
  const paletteRamps = HOUSE_PALETTE_RAMPS[palette] ?? HOUSE_PALETTE_RAMPS.thread_sage
  // At night the windows are lit in every palette
  const ramps = lit ? { ...paletteRamps, glass: LIT_GLASS_RAMP } : paletteRamps
  const map = new Map<number, [number, number, number]>()
  for (const part of Object.keys(KEY_RAMPS) as HousePart[]) {
    KEY_RAMPS[part].forEach((key, step) => {
      const [r, g, b] = hexToRgb(key)
      map.set(rgbKey(r, g, b), hexToRgb(ramps[part][step]))
    })
  }
  return map
}

/**
 * Swap key colours in RGBA pixel data, in place. Only exact, fully solid
 * key pixels change; everything else is drawn as it is. Returns how many
 * pixels changed.
 */
export function swapKeyColours(data: Uint8ClampedArray, map: Map<number, [number, number, number]>): number {
  let changed = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 255) continue
    const to = map.get(rgbKey(data[i], data[i + 1], data[i + 2]))
    if (!to) continue
    data[i] = to[0]
    data[i + 1] = to[1]
    data[i + 2] = to[2]
    changed++
  }
  return changed
}

/** Customisations that pick an option sprite, and the socket(s) it fills. */
const OPTION_SOCKETS: Record<string, { field: string; sockets: string[] }> = {
  door: { field: 'doorStyle', sockets: ['door'] },
  window: { field: 'windowStyle', sockets: ['window-left', 'window-right'] },
  chimney: { field: 'chimneyStyle', sockets: ['chimney'] },
}

/**
 * The option sprites to draw for a house's customisations, each with its
 * socket box. A choice with no drawing yet is left out (the base shows).
 */
export function houseOptionSprites(
  template: string,
  set: HouseLayerSet,
  customizations: Record<string, unknown> | undefined
): { name: string; src: string; box: SocketBox }[] {
  const boxes = HOUSE_SOCKETS[template] ?? {}
  const out: { name: string; src: string; box: SocketBox }[] = []
  for (const [prefix, { field, sockets: names }] of Object.entries(OPTION_SOCKETS)) {
    const choice = customizations?.[field]
    if (typeof choice !== 'string' || !choice || choice === 'default') continue
    const name = `${prefix}-${choice}`
    const src = set.options[name]
    if (!src) continue
    for (const socket of names) if (boxes[socket]) out.push({ name, src, box: boxes[socket] })
  }
  return out
}
