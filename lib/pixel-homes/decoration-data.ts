import { HouseTemplate, ColorPalette } from '../../components/pixel-homes/HouseSVG'

export interface DecorationItem {
    id: string
    decorationId?: string
    name: string
    type: 'plant' | 'path' | 'feature' | 'seasonal' | 'furniture' | 'lighting' | 'water' | 'structure' | 'house_custom' | 'house_color' | 'sky' | 'house_template' | 'custom'
    zone?: 'front_yard' | 'house_facade' | 'background'
    position?: { x: number; y: number; layer?: number }
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
    [key: string]: any
}

export interface AtmosphereSettings {
    sky: 'sunny' | 'cloudy' | 'sunset' | 'night'
    weather: 'clear' | 'light_rain' | 'light_snow'
    timeOfDay: 'morning' | 'midday' | 'evening' | 'night'
}

export const PALETTE_COLORS = {
    thread_sage: {
        primary: '#A18463',    // sage
        secondary: '#2E4B3F',  // pine  
        accent: '#8EC5E8',     // sky
        base: '#F5E9D4',       // cream
        detail: '#4FAF6D'      // meadow
    },
    charcoal_nights: {
        primary: '#2F2F2F',    // charcoal
        secondary: '#B8B8B8',  // stone
        accent: '#E27D60',     // sunset
        base: '#FCFAF7',       // paper
        detail: '#A18463'      // sage
    },
    pixel_petals: {
        primary: '#E27D60',    // sunset
        secondary: '#4FAF6D',  // meadow
        accent: '#8EC5E8',     // sky
        base: '#F5E9D4',       // cream
        detail: '#2E4B3F'      // pine
    },
    crt_glow: {
        primary: '#8EC5E8',    // sky
        secondary: '#2F2F2F',  // charcoal
        accent: '#4FAF6D',     // meadow
        base: '#FCFAF7',       // paper
        detail: '#E27D60'      // sunset
    },
    classic_linen: {
        primary: '#A18463',    // sage
        secondary: '#2E4B3F',  // pine
        accent: '#E27D60',     // sunset
        base: '#FCFAF7',       // paper
        detail: '#8EC5E8'      // sky
    }
}

// BETA_ITEMS has been migrated to the database (DecorationItem table)
// Decorations are now managed via /admin/decorations
// The migration script at /api/admin/decorations/migrate was used to populate the database

export interface TerrainTile {
    id: string
    name: string
    color: string // Fallback color
    texture?: string // Optional texture pattern
}

export const TERRAIN_TILES: TerrainTile[] = [
    { id: 'grass', name: 'Grass', color: '#90EE90' }, // Default
    { id: 'dirt', name: 'Dirt', color: '#8B4513' },
    { id: 'stone_path', name: 'Stone Path', color: '#808080' },
    { id: 'brick_path', name: 'Brick Path', color: '#A52A2A' },
    { id: 'water', name: 'Water', color: '#4682B4' },
    { id: 'sand', name: 'Sand', color: '#F4A460' },
    { id: 'gravel', name: 'Gravel', color: '#708090' },
    // New terrain types
    { id: 'flower_bed', name: 'Flower Bed', color: '#3D2314' },
    { id: 'mulch', name: 'Mulch', color: '#5D4037' },
    { id: 'moss', name: 'Moss', color: '#7CB342' },
    { id: 'pebbles', name: 'Pebbles', color: '#90A4AE' },
    { id: 'cobblestone', name: 'Cobblestone', color: '#9E9E9E' },
    { id: 'wood_deck', name: 'Wood Deck', color: '#A1887F' }
]
