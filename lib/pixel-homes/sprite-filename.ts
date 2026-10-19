/**
 * What a sprite's filename says about it (design/pixel-art/README.md):
 *
 *   plant_roses_red.png        item roses_red, a plant
 *   water_fountain@4f.png      item fountain, water, a 4-frame strip
 *   seasonal_pumpkin_2026.png  item pumpkin_2026, seasonal
 *   house_cabin_roof.png       the cabin's roof layer
 *
 * Shared by the admin "New from PNG" page, its API and the batch upload script.
 */

/** Decoration types a sprite can be, with the palette category each goes in. */
export const SPRITE_TYPES = {
  plant: 'plants',
  path: 'paths',
  feature: 'features',
  furniture: 'furniture',
  lighting: 'lighting',
  water: 'water',
  structure: 'structures',
  // The palette has no seasonal tab; a drop is grouped by its collection.
  seasonal: 'features',
} as const

export type SpriteType = keyof typeof SPRITE_TYPES

export const MAX_FRAMES = 8

export type ParsedSpriteName =
  | { kind: 'decoration'; itemId: string; type: SpriteType; category: string; frames: number }
  | { kind: 'house'; template: string; layer: string }

export type SpriteNameResult = { ok: true; value: ParsedSpriteName } | { ok: false; error: string }

const WORD = '[a-z0-9]+'
const DECORATION_RE = new RegExp(`^(${Object.keys(SPRITE_TYPES).join('|')})_(${WORD}(?:_${WORD})*)(?:@(\\d+)f)?$`)
const HOUSE_RE = new RegExp(`^house_(${WORD})_(${WORD}(?:-${WORD})*)$`)

export function parseSpriteFilename(filename: string): SpriteNameResult {
  const base = filename.split(/[\\/]/).pop() ?? ''
  if (!/\.png$/i.test(base)) return { ok: false, error: 'Sprites are PNG files.' }
  const stem = base.replace(/\.png$/i, '')

  const house = HOUSE_RE.exec(stem)
  if (house) return { ok: true, value: { kind: 'house', template: house[1], layer: house[2] } }

  const match = DECORATION_RE.exec(stem)
  if (!match) {
    const first = stem.split('_')[0]
    if (stem !== stem.toLowerCase()) return { ok: false, error: 'Use lowercase letters, numbers and underscores in the name.' }
    if (!(first in SPRITE_TYPES)) {
      return { ok: false, error: `The name has to start with a type: ${Object.keys(SPRITE_TYPES).join(', ')}.` }
    }
    return { ok: false, error: 'Name it type_item.png, like plant_roses_red.png, or type_item@4f.png for 4 frames.' }
  }

  const type = match[1] as SpriteType
  const frames = match[3] ? Number(match[3]) : 1
  if (frames < 1 || frames > MAX_FRAMES) return { ok: false, error: `A strip can have 1 to ${MAX_FRAMES} frames.` }
  return { ok: true, value: { kind: 'decoration', itemId: match[2], type, category: SPRITE_TYPES[type], frames } }
}

/** "roses_red" → "Roses Red", a starting name the admin can change. */
export function nameFromItemId(itemId: string): string {
  return itemId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
