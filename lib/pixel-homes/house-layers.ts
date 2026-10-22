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
import { HOUSE_PALETTE_RAMPS, KEY_RAMPS, type HousePart } from './palette'

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
]

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
export const HOUSE_LAYER_SETS: Record<string, HouseLayerSet> = {
  cabin_v1: drawnSet('cabin_v1', ALL_OPTIONS),
  cottage_v1: drawnSet('cottage_v1', ALL_OPTIONS),
  // The townhouse's own door is the double door
  townhouse_v1: drawnSet('townhouse_v1', ALL_OPTIONS.filter((o) => o !== 'door-double'), ['door-double']),
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

/** Key colour (as 0xRRGGBB) → the palette's colour, for every step of every part. */
export function keyColourMap(palette: string): Map<number, [number, number, number]> {
  const ramps = HOUSE_PALETTE_RAMPS[palette] ?? HOUSE_PALETTE_RAMPS.thread_sage
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

/** Choices the sprite art doesn't draw yet; homes using them keep HouseSVG. */
const NOT_DRAWN_YET = ['roofTrim', 'windowTreatments']

/**
 * Whether a layer set can show this home as its owner set it up. False when
 * they picked their own colours, a roof trim or window treatment, or an
 * option with no drawing in this set.
 */
export function spriteDrawable(set: HouseLayerSet, customizations: Record<string, unknown> | undefined): boolean {
  const c = customizations ?? {}
  if (['wallColor', 'roofColor', 'trimColor', 'windowColor', 'detailColor'].some((k) => c[k])) return false
  if (NOT_DRAWN_YET.some((k) => { const v = picked(c[k]); return v !== null && v !== 'none' })) return false
  for (const [prefix, { field }] of Object.entries(OPTION_SOCKETS)) {
    const choice = picked(c[field])
    if (!choice) continue
    const name = `${prefix}-${choice}`
    if (set.options[name] || set.sameAsDefault?.includes(name)) continue
    if (choice === 'none' && set.options[`${prefix}-default`]) continue
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
