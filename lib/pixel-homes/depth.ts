/**
 * What draws in front of what in a pixel-home yard (pixel-homes PLAN.md,
 * Phase 3 step 4). One rule for the editor, the visitor view and the share
 * snapshot:
 *
 *  - Paths, then water, lie flat under everything else.
 *  - Everything else, the house included, sorts by its feet (the bottom
 *    edge): further down the yard is nearer the viewer. So a tree whose feet
 *    are above the house's sort line (where its walls meet the foundation)
 *    stands behind the house, and flowers planted against the foundation
 *    stand in front.
 *  - layerBias moves a decoration a whole level back or forward, past
 *    everything at the level it left (send back / bring forward).
 *
 * Depth is worked out at render time; nothing stored is a magic number.
 */
import { getDecorationDimensions } from './decoration-dimensions'

/** Where the house sits in the 512 × 352 scene. */
export const HOUSE_BOX = { x: 156, y: 32, width: 200, height: 180 }
/**
 * The house's sort line in scene px: where its walls meet the foundation
 * (y 150 of its 180 in every template). Anything whose feet are on or below
 * it, such as flowers planted against the foundation stones, stands in front.
 */
export const HOUSE_SORT_Y = HOUSE_BOX.y + 150
/** The part of the house that is actually drawn (walls, roof, chimney and foundation), for overlap checks. */
export const HOUSE_DRAWN = { x: HOUSE_BOX.x + 20, y: HOUSE_BOX.y, width: 160, height: 170 }

/**
 * Things people hang on or lean against the house. Where one overlaps the
 * house it stands in front of the wall, wherever its feet are; Send back
 * still puts it behind.
 */
export const HUNG_ON_HOUSE = new Set(['string_lights', 'wind_chimes', 'garden_lantern', 'trellis', 'garden_arch'])

export const MIN_LAYER_BIAS = -3
export const MAX_LAYER_BIAS = 3

// Bands, from the inside out: x (0–999), feet × 1000 (under 1M), flat or
// standing (BAND each), then the bias level.
const BAND = 1_000_000
const LEVEL = 10_000_000
/** Keeps every depth positive; also the floor of the scene's z-indexes. */
const BASE = (1 - MIN_LAYER_BIAS) * LEVEL
/** Above any decoration or the house (the editor's cursor and guides). */
export const OVERLAY_DEPTH = BASE + (MAX_LAYER_BIAS + 1) * LEVEL

function typeBase(type: string): number {
  if (type === 'path') return 0
  if (type === 'water') return BAND
  return 2 * BAND
}

export function clampLayerBias(bias: unknown): number {
  const n = typeof bias === 'number' && Number.isFinite(bias) ? Math.round(bias) : 0
  return Math.min(MAX_LAYER_BIAS, Math.max(MIN_LAYER_BIAS, n))
}

export interface DepthItem {
  type: string
  decorationId?: string
  id: string
  size?: string
  position?: { x: number; y: number }
  layerBias?: number | null
}

/** A decoration's z-index: level, then flat-or-standing, then feet, then left to right. */
export function decorationDepth(item: DepthItem): number {
  const size = (item.size || 'medium') as 'small' | 'medium' | 'large'
  const { height } = getDecorationDimensions(item.decorationId || item.id, item.type, size)
  const x = Math.round(item.position?.x ?? 0)
  let feet = Math.round((item.position?.y ?? 0) + height)
  // Hung on the wall: sorts as if planted at the house's line, just in front of it
  if (HUNG_ON_HOUSE.has(item.decorationId || item.id) && feet < HOUSE_SORT_Y && overlapsHouse(item)) feet = HOUSE_SORT_Y
  return (
    BASE +
    clampLayerBias(item.layerBias) * LEVEL +
    typeBase(item.type) +
    Math.min(999, Math.max(0, feet)) * 1000 +
    // x is clamped so it can never spill into the next feet row
    Math.min(999, Math.max(0, x + 128))
  )
}

/**
 * The house's z-index: a standing thing whose feet are on its sort line,
 * placed just before anything else with the same feet, so flowers planted
 * right on the line draw in front of it.
 */
export function houseDepth(): number {
  return BASE + typeBase('house') + HOUSE_SORT_Y * 1000 - 1
}

/** Whether a decoration's box overlaps the drawn house. */
export function overlapsHouse(item: DepthItem): boolean {
  const size = (item.size || 'medium') as 'small' | 'medium' | 'large'
  const { width, height } = getDecorationDimensions(item.decorationId || item.id, item.type, size)
  const x = item.position?.x ?? 0
  const y = item.position?.y ?? 0
  return x < HOUSE_DRAWN.x + HOUSE_DRAWN.width && x + width > HOUSE_DRAWN.x && y < HOUSE_DRAWN.y + HOUSE_DRAWN.height && y + height > HOUSE_DRAWN.y
}

/**
 * Whether this decoration drew in front of the house before the house
 * joined the sort, and now draws behind it (it overlaps the house and its
 * feet are above its sort line). Used by the optional depth backfill.
 */
export function movesBehindHouse(item: DepthItem): boolean {
  if (item.type === 'path' || item.type === 'water') return false
  return clampLayerBias(item.layerBias) === 0 && overlapsHouse(item) && decorationDepth(item) < houseDepth()
}
