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
 * A home whose choices the art can't show yet keeps HouseSVG too
 * (spriteDrawable), so nobody's house loses something they picked.
 */
import sockets from '../../design/pixel-art/_template-house.sockets.json'
import { HOUSE_PALETTE_RAMPS, KEY_RAMPS, type HousePart, type HouseRamps } from './palette'

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
  /** Choices that look the same as the default drawing ("door-double" on the townhouse) */
  sameAsDefault?: string[]
  /** A stand-in made from the code-drawn house, for testing the renderer */
  placeholder?: boolean
}

export const HOUSE_SIZE = { width: 200, height: 180 } as const

/** Socket boxes per template, from design/pixel-art/_template-house.sockets.json. */
export const HOUSE_SOCKETS: Record<string, Record<string, SocketBox>> = {
  cabin_v1: sockets.cabin.sockets,
  cottage_v1: sockets.cottage.sockets,
  townhouse_v1: sockets.townhouse.sockets,
  loft_v1: sockets.loft.sockets,
}

/** Every option sprite a template can have. The default chimney is its own sprite so "no chimney" can leave it out. */
const ALL_OPTIONS = [
  'door-arched', 'door-double', 'door-cottage',
  'window-round', 'window-arched', 'window-bay',
  'chimney-default', 'chimney-brick', 'chimney-stone',
  'trim-ornate', 'trim-scalloped', 'trim-gabled',
  'treatment-shutters', 'treatment-awnings', 'treatment-flower_boxes',
]
const without = (...names: string[]) => ALL_OPTIONS.filter((o) => !names.includes(o))

/** public/pixel-homes/house-layers/<template>/house_<name>_<layer>.png */
function drawnSet(template: string, options: string[], sameAsDefault?: string[]): HouseLayerSet {
  const name = template.replace(/_v\d+$/, '')
  const file = (layer: string) => `/pixel-homes/house-layers/${template}/house_${name}_${layer}.png`
  return {
    layers: { base: file('base'), roof: file('roof') },
    options: Object.fromEntries(options.map((option) => [option, file(option)])),
    ...(sameAsDefault ? { sameAsDefault } : {}),
  }
}

/**
 * The layer art per template. The placeholder is only used where something
 * asks for it by name (admin previews, tests).
 */
// Every house but the loft already has flower boxes under its windows.
export const HOUSE_LAYER_SETS: Record<string, HouseLayerSet> = {
  cabin_v1: drawnSet('cabin_v1', without('treatment-flower_boxes'), ['treatment-flower_boxes']),
  cottage_v1: drawnSet('cottage_v1', without('treatment-flower_boxes'), ['treatment-flower_boxes']),
  // The townhouse's own door is the double door
  townhouse_v1: drawnSet('townhouse_v1', without('door-double', 'treatment-flower_boxes'), ['door-double', 'treatment-flower_boxes']),
  loft_v1: drawnSet('loft_v1', ALL_OPTIONS),
}

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

/** A resident's own colour per part (HouseSVG's wallColor, roofColor, …); detailColor has no part here. */
const OWN_COLOUR_FIELDS: Record<HousePart, string> = {
  wall: 'wallColor',
  roof: 'roofColor',
  trim: 'trimColor',
  glass: 'windowColor',
}

/** "#abc" or "#aabbcc" as "#aabbcc", or null for anything else. */
function sixDigitHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('')
  return null
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
  return [h * 60, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  s = clamp(s); l = clamp(l); h = ((h % 360) + 360) % 360
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

/**
 * Four shades, dark to light, around a picked colour (step 3 is the colour
 * itself). Shadows lean a little towards blue and highlights towards
 * yellow, the way the master palette's ramps do, so it still reads as
 * pixel art rather than flat tints.
 */
export function rampFromColour(hex: string): [string, string, string, string] {
  const [h, s, l] = rgbToHsl(hexToRgb(hex))
  const towards = (target: number, by: number) => {
    const diff = ((target - h + 540) % 360) - 180
    return h + Math.sign(diff) * Math.min(Math.abs(diff), by)
  }
  return [
    hslToHex(towards(240, 14), s * 0.9 + 0.08, l * 0.5),
    hslToHex(towards(240, 7), s * 0.95 + 0.04, l * 0.75),
    hex,
    hslToHex(towards(60, 8), s * 0.85, l + (1 - l) * 0.45),
  ]
}

/** The ramps a house is painted in: its palette's, with any part the resident coloured themselves swapped for a ramp built from that colour. */
export function houseRamps(palette: string, customizations?: Record<string, unknown>): HouseRamps {
  const base = HOUSE_PALETTE_RAMPS[palette] ?? HOUSE_PALETTE_RAMPS.thread_sage
  const out = { ...base } as Record<HousePart, readonly [string, string, string, string]>
  for (const part of Object.keys(OWN_COLOUR_FIELDS) as HousePart[]) {
    const own = sixDigitHex(customizations?.[OWN_COLOUR_FIELDS[part]])
    if (own) out[part] = rampFromColour(own)
  }
  return out
}

/** A key for caching recoloured layers: the four ramps, flattened. */
export function rampsKey(ramps: HouseRamps): string {
  return (Object.keys(KEY_RAMPS) as HousePart[]).map((part) => ramps[part].join(',')).join('|')
}

/** Key colour (as 0xRRGGBB) → the house's colour, for every step of every part. */
export function keyColourMap(palette: string, customizations?: Record<string, unknown>): Map<number, [number, number, number]> {
  const ramps = houseRamps(palette, customizations)
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

/**
 * Customisations that pick an option sprite, and the socket(s) it fills,
 * drawn in this order. A part with `drawnByDefault` shows something when
 * nothing is picked (the chimney); the rest show nothing.
 */
const OPTION_SOCKETS: Record<string, { field: string; sockets: string[]; drawnByDefault?: boolean }> = {
  door: { field: 'doorStyle', sockets: ['door'] },
  window: { field: 'windowStyle', sockets: ['window-left', 'window-right'] },
  chimney: { field: 'chimneyStyle', sockets: ['chimney'], drawnByDefault: true },
  trim: { field: 'roofTrim', sockets: ['trim'] },
  treatment: { field: 'windowTreatments', sockets: ['treatment-left', 'treatment-right'] },
}

const picked = (value: unknown): string | null =>
  typeof value === 'string' && value && value !== 'default' ? value : null

/**
 * The option sprites to draw for a house's customisations, each with its
 * socket box. The default chimney is drawn unless someone picked another or
 * "none". A choice with no drawing is left out (see spriteDrawable).
 */
export function houseOptionSprites(
  template: string,
  set: HouseLayerSet,
  customizations: Record<string, unknown> | undefined
): { name: string; src: string; box: SocketBox }[] {
  const boxes = HOUSE_SOCKETS[template] ?? {}
  const out: { name: string; src: string; box: SocketBox }[] = []
  for (const [prefix, { field, sockets: names }] of Object.entries(OPTION_SOCKETS)) {
    const choice = picked(customizations?.[field]) ?? 'default'
    if (choice === 'none') continue
    const name = `${prefix}-${choice}`
    const src = set.options[name]
    if (!src) continue
    for (const socket of names) if (boxes[socket]) out.push({ name, src, box: boxes[socket] })
  }
  return out
}

/**
 * Whether a layer set can show this home as its owner set it up: false when
 * they picked an option with no drawing in this set. Their own colours are
 * fine; the layers are painted in ramps built from them (houseRamps).
 */
export function spriteDrawable(set: HouseLayerSet, customizations: Record<string, unknown> | undefined): boolean {
  const c = customizations ?? {}
  for (const [prefix, { field, drawnByDefault }] of Object.entries(OPTION_SOCKETS)) {
    const choice = picked(c[field])
    if (!choice) continue
    const name = `${prefix}-${choice}`
    if (set.options[name] || set.sameAsDefault?.includes(name)) continue
    // "none" works when there's nothing to hide, or the default is a sprite we can leave out
    if (choice === 'none' && (!drawnByDefault || set.options[`${prefix}-default`])) continue
    return false
  }
  return true
}

/**
 * Where HouseSVG's sign, house number, mat and lights go on a sprite house,
 * in house pixels, from the template's sockets. The sign hangs on chains
 * above its board, so its board starts 6px into the box.
 */
export function houseExtrasAt(template: string) {
  const box = HOUSE_SOCKETS[template] ?? HOUSE_SOCKETS.cabin_v1
  const centre = (b: SocketBox) => b.x + b.w / 2
  return {
    sign: { x: centre(box.sign), y: box.sign.y + 6 },
    number: { x: centre(box.number), y: box.number.y + 5 },
    mat: { x: centre(box.mat), y: box.mat.y },
    lights: { x: box.door.x, y: box.door.y },
  }
}

/** The front door of a sprite house, in house pixels. */
export function spriteDoorRect(template: string) {
  const door = (HOUSE_SOCKETS[template] ?? HOUSE_SOCKETS.cabin_v1).door
  return { x: door.x, y: door.y, width: door.w, height: door.h }
}
