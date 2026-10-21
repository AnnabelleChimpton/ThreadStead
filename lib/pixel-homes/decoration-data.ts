import { PALETTE_RAMPS } from './palette'

export interface DecorationItem {
    id: string
    decorationId?: string
    name: string
    type: 'plant' | 'path' | 'feature' | 'seasonal' | 'furniture' | 'lighting' | 'water' | 'structure' | 'house_custom' | 'house_color' | 'sky' | 'house_template' | 'custom'
    zone?: 'front_yard' | 'house_facade' | 'background'
    position?: { x: number; y: number; layer?: number }
    gridX?: number | null    // Grid cell of the top-left; null/undefined = free placement at position
    gridY?: number | null
    layerBias?: number       // Send back (-) / bring forward (+), see lib/pixel-homes/depth.ts
    variant?: string
    size?: 'small' | 'medium' | 'large'
    color?: string  // For house color items
    gridPosition?: { gridX: number; gridY: number; width: number; height: number }
    section?: string
    isDefault?: boolean
    customAssetUrl?: string  // URL to user's uploaded custom pixel art
    slot?: number            // For custom assets: which slot (0-4)
    isEmpty?: boolean        // For custom assets: whether slot is empty (show upload UI)
    pngUrl?: string          // R2 CDN URL for PNG asset (from database)
    pngWidth?: number | null  // The PNG's own size (one frame), stored on upload
    pngHeight?: number | null
    pngFrames?: number | null // >1: a horizontal strip of frames
    note?: string            // The owner's note (stored as data.note), lib/pixel-homes/decoration-note.ts
    [key: string]: any
}

/** Whether a placed decoration is drawn mirrored (stored as data.flip). */
export function isFlipped(d: unknown): boolean {
    const data = (d as { data?: unknown } | null)?.data
    return !!(data && typeof data === 'object' && (data as { flip?: unknown }).flip === true)
}

export interface AtmosphereSettings {
    sky: 'sunny' | 'cloudy' | 'sunset' | 'night'
    weather: 'clear' | 'light_rain' | 'light_snow'
    timeOfDay: 'morning' | 'midday' | 'evening' | 'night'
}

// BETA_ITEMS has been migrated to the database (DecorationItem table)
// Decorations are now managed via /admin/decorations
// The migration script at /api/admin/decorations/migrate was used to populate the database

/**
 * A terrain tile's colours, all threadstead-44: the main colour, a step darker
 * and a step lighter, and an accent for joints, mortar, plank seams or a glint.
 * Stone and cobble take a "lighter" step of about the same lightness from the
 * other grey ramp, so their stones vary in hue rather than read as a checker;
 * cobbles are warm and cool stones between dark joints.
 * The yard's patterns (TerrainDitherDefs) and the editor's tile icons both
 * paint with these.
 */
export interface TerrainShades {
    base: string
    dark: string
    light: string
    accent: string
}

export interface TerrainTile {
    id: string
    name: string
    color: string // Fallback color, the shades' base
    shades: TerrainShades
}

const R = PALETTE_RAMPS
const tile = (id: string, name: string, shades: TerrainShades): TerrainTile => ({ id, name, color: shades.base, shades })

export const TERRAIN_TILES: TerrainTile[] = [
    // Default: the lawn itself
    tile('grass', 'Grass', { base: R.foliage[3], dark: R.foliage[2], light: R.foliage[4], accent: R.foliage[2] }),
    tile('dirt', 'Dirt', { base: R.wood[2], dark: R.wood[1], light: R.wood[3], accent: R.wood[1] }),
    tile('stone_path', 'Stone Path', { base: R.slate[2], dark: R.slate[1], light: R.ink[3], accent: R.slate[1] }),
    tile('brick_path', 'Brick Path', { base: R.terracotta[0], dark: R.terracotta[0], light: R.red[1], accent: R.red[0] }),
    tile('water', 'Water', { base: R.sky[1], dark: R.sky[0], light: R.sky[2], accent: R.sky[3] }),
    tile('sand', 'Sand', { base: R.wood[4], dark: R.terracotta[1], light: R.terracotta[2], accent: R.terracotta[1] }),
    tile('gravel', 'Gravel', { base: R.slate[1], dark: R.slate[0], light: R.slate[2], accent: R.slate[0] }),
    tile('flower_bed', 'Flower Bed', { base: R.wood[0], dark: R.ink[0], light: R.wood[1], accent: R.ink[0] }),
    tile('mulch', 'Mulch', { base: R.wood[1], dark: R.wood[0], light: R.wood[2], accent: R.wood[0] }),
    tile('moss', 'Moss', { base: R.foliage[4], dark: R.foliage[3], light: R.butter[2], accent: R.foliage[3] }),
    tile('pebbles', 'Pebbles', { base: R.slate[2], dark: R.slate[1], light: R.slate[3], accent: R.slate[1] }),
    tile('cobblestone', 'Cobblestone', { base: R.ink[3], dark: R.ink[3], light: R.slate[2], accent: R.ink[2] }),
    tile('wood_deck', 'Wood Deck', { base: R.wood[4], dark: R.terracotta[1], light: R.terracotta[2], accent: R.wood[3] }),
]
