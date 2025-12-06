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

export const BETA_ITEMS = {
    plants: [
        { id: 'roses_red', name: 'Red Roses', type: 'plant', zone: 'front_yard' },
        { id: 'roses_pink', name: 'Pink Roses', type: 'plant', zone: 'front_yard' },
        { id: 'roses_white', name: 'White Roses', type: 'plant', zone: 'front_yard' },
        { id: 'daisies_white', name: 'White Daisies', type: 'plant', zone: 'front_yard' },
        { id: 'daisies_yellow', name: 'Yellow Daisies', type: 'plant', zone: 'front_yard' },
        { id: 'small_tree', name: 'Small Tree', type: 'plant', zone: 'front_yard' },
        { id: 'tree_oak', name: 'Oak Tree', type: 'plant', zone: 'front_yard' },
        { id: 'tree_pine', name: 'Pine Tree', type: 'plant', zone: 'front_yard' },
        { id: 'sunflowers', name: 'Sunflowers', type: 'plant', zone: 'front_yard' },
        { id: 'lavender', name: 'Lavender', type: 'plant', zone: 'front_yard' },
        { id: 'flower_pot', name: 'Flower Pot', type: 'plant', zone: 'front_yard' },
        { id: 'planter_box', name: 'Planter Box', type: 'furniture', zone: 'front_yard' },
        { id: 'potted_herbs', name: 'Potted Herbs', type: 'plant', zone: 'front_yard' }
    ],
    // Paths are now handled by the terrain system
    // paths: [
    //     { id: 'stone_path', name: 'Stone Path', type: 'path', zone: 'front_yard' },
    //     { id: 'brick_path', name: 'Brick Path', type: 'path', zone: 'front_yard' },
    //     { id: 'stepping_stones', name: 'Stepping Stones', type: 'path', zone: 'front_yard' },
    //     { id: 'gravel_path', name: 'Gravel Path', type: 'path', zone: 'front_yard' }
    // ],
    features: [
        { id: 'bird_bath', name: 'Bird Bath', type: 'feature', zone: 'front_yard' },
        { id: 'garden_gnome', name: 'Garden Gnome', type: 'feature', zone: 'front_yard' },
        { id: 'decorative_fence', name: 'Decorative Fence', type: 'feature', zone: 'front_yard' },
        { id: 'wind_chimes', name: 'Wind Chimes', type: 'feature', zone: 'front_yard' },
        // New lawn ornaments
        { id: 'flamingo', name: 'Pink Flamingo', type: 'feature', zone: 'front_yard' },
        { id: 'garden_sphere', name: 'Gazing Ball', type: 'feature', zone: 'front_yard' },
        { id: 'sundial', name: 'Sundial', type: 'feature', zone: 'front_yard' },
        { id: 'garden_gnome_fishing', name: 'Fishing Gnome', type: 'feature', zone: 'front_yard' },
        { id: 'garden_gnome_reading', name: 'Reading Gnome', type: 'feature', zone: 'front_yard' },
        { id: 'watering_can', name: 'Watering Can', type: 'feature', zone: 'front_yard' },
        { id: 'garden_tools', name: 'Garden Tools', type: 'feature', zone: 'front_yard' },
        { id: 'wheelbarrow', name: 'Wheelbarrow', type: 'feature', zone: 'front_yard' },
        // Cozy additions
        { id: 'sleeping_cat', name: 'Sleeping Cat', type: 'feature', zone: 'front_yard' },
        { id: 'sleeping_dog', name: 'Sleeping Dog', type: 'feature', zone: 'front_yard' },
        { id: 'bird_feeder', name: 'Bird Feeder', type: 'feature', zone: 'front_yard' },
        { id: 'firewood_stack', name: 'Firewood Stack', type: 'feature', zone: 'front_yard' },
        { id: 'clothesline', name: 'Clothesline', type: 'feature', zone: 'front_yard' },
        { id: 'welcome_sign', name: 'Welcome Sign', type: 'feature', zone: 'front_yard' }
    ],
    furniture: [
        { id: 'garden_bench', name: 'Garden Bench', type: 'furniture', zone: 'front_yard' },
        { id: 'outdoor_table', name: 'Outdoor Table', type: 'furniture', zone: 'front_yard' },
        { id: 'mailbox', name: 'Mailbox', type: 'furniture', zone: 'front_yard' },
        { id: 'planter_box', name: 'Planter Box', type: 'furniture', zone: 'front_yard' },
        { id: 'picnic_table', name: 'Picnic Table', type: 'furniture', zone: 'front_yard' },
        // New garden furniture
        { id: 'raised_bed', name: 'Raised Garden Bed', type: 'furniture', zone: 'front_yard' },
        { id: 'compost_bin', name: 'Compost Bin', type: 'furniture', zone: 'front_yard' },
        { id: 'garden_cart', name: 'Garden Cart', type: 'furniture', zone: 'front_yard' },
        // Cozy additions
        { id: 'rocking_chair', name: 'Rocking Chair', type: 'furniture', zone: 'front_yard' },
        { id: 'garden_swing', name: 'Garden Swing', type: 'furniture', zone: 'front_yard' },
        { id: 'cozy_blanket', name: 'Cozy Blanket', type: 'furniture', zone: 'front_yard' }
    ],
    fencing: [
        { id: 'picket_fence_white', name: 'White Picket Fence', type: 'structure', zone: 'front_yard' },
        { id: 'picket_fence_natural', name: 'Natural Picket Fence', type: 'structure', zone: 'front_yard' },
        { id: 'rustic_fence', name: 'Rustic Fence', type: 'structure', zone: 'front_yard' },
        { id: 'stone_wall', name: 'Low Stone Wall', type: 'structure', zone: 'front_yard' },
        { id: 'hedge', name: 'Garden Hedge', type: 'plant', zone: 'front_yard' },
        { id: 'hedge_round', name: 'Round Hedge', type: 'plant', zone: 'front_yard' }
    ],
    lighting: [
        { id: 'garden_lantern', name: 'Garden Lantern', type: 'lighting', zone: 'front_yard' },
        { id: 'string_lights', name: 'String Lights', type: 'lighting', zone: 'front_yard' },
        { id: 'torch', name: 'Garden Torch', type: 'lighting', zone: 'front_yard' },
        { id: 'spotlight', name: 'Spotlight', type: 'lighting', zone: 'front_yard' }
    ],
    water: [
        { id: 'fountain', name: 'Garden Fountain', type: 'water', zone: 'front_yard' },
        { id: 'pond', name: 'Small Pond', type: 'water', zone: 'front_yard' },
        { id: 'rain_barrel', name: 'Rain Barrel', type: 'water', zone: 'front_yard' }
    ],
    structures: [
        { id: 'gazebo', name: 'Garden Gazebo', type: 'structure', zone: 'front_yard' },
        { id: 'trellis', name: 'Garden Trellis', type: 'structure', zone: 'front_yard' },
        { id: 'garden_arch', name: 'Garden Arch', type: 'structure', zone: 'front_yard' },
        { id: 'sign_post', name: 'Sign Post', type: 'structure', zone: 'front_yard' },
        { id: 'wishing_well', name: 'Wishing Well', type: 'structure', zone: 'front_yard' }
    ],
    atmosphere: [
        { id: 'sunny_sky', name: 'Sunny Day', type: 'sky', zone: 'background' },
        { id: 'cloudy_sky', name: 'Cloudy Day', type: 'sky', zone: 'background' },
        { id: 'sunset_sky', name: 'Sunset', type: 'sky', zone: 'background' },
        { id: 'night_sky', name: 'Starry Night', type: 'sky', zone: 'background' }
    ],
    house: [
        // Doors Section
        { id: 'default_door', name: 'Default Door', type: 'house_custom', zone: 'house_facade', section: 'doors', isDefault: true },
        { id: 'arched_door', name: 'Arched Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },
        { id: 'double_door', name: 'Double Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },
        { id: 'cottage_door', name: 'Cottage Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },

        // Windows Section
        { id: 'default_windows', name: 'Default Windows', type: 'house_custom', zone: 'house_facade', section: 'windows', isDefault: true },
        { id: 'round_windows', name: 'Round Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },
        { id: 'arched_windows', name: 'Arched Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },
        { id: 'bay_windows', name: 'Bay Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },

        // Window Treatments Section
        { id: 'default_treatments', name: 'No Treatment', type: 'house_custom', zone: 'house_facade', section: 'window_treatments', isDefault: true },
        { id: 'shutters', name: 'Shutters', type: 'house_custom', zone: 'house_facade', section: 'window_treatments' },
        { id: 'flower_boxes', name: 'Flower Boxes', type: 'house_custom', zone: 'house_facade', section: 'window_treatments' },
        { id: 'awnings', name: 'Awnings', type: 'house_custom', zone: 'house_facade', section: 'window_treatments' },

        // Roof Trim Section
        { id: 'default_trim', name: 'Default Trim', type: 'house_custom', zone: 'house_facade', section: 'roof', isDefault: true },
        { id: 'ornate_trim', name: 'Ornate Roof Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' },
        { id: 'scalloped_trim', name: 'Scalloped Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' },
        { id: 'gabled_trim', name: 'Gabled Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' },

        // Chimney Section
        { id: 'default_chimney', name: 'Default Chimney', type: 'house_custom', zone: 'house_facade', section: 'chimney', isDefault: true },
        { id: 'brick_chimney', name: 'Brick Chimney', type: 'house_custom', zone: 'house_facade', section: 'chimney' },
        { id: 'stone_chimney', name: 'Stone Chimney', type: 'house_custom', zone: 'house_facade', section: 'chimney' },
        { id: 'no_chimney', name: 'No Chimney', type: 'house_custom', zone: 'house_facade', section: 'chimney' },

        // Welcome Mat Section
        { id: 'no_mat', name: 'No Mat', type: 'house_custom', zone: 'house_facade', section: 'welcome_mat', isDefault: true },
        { id: 'plain_mat', name: 'Plain Mat', type: 'house_custom', zone: 'house_facade', section: 'welcome_mat' },
        { id: 'floral_mat', name: 'Floral Mat', type: 'house_custom', zone: 'house_facade', section: 'welcome_mat' },
        { id: 'welcome_text_mat', name: 'Welcome Mat', type: 'house_custom', zone: 'house_facade', section: 'welcome_mat' },
        { id: 'custom_text_mat', name: 'Custom Text Mat', type: 'house_custom', zone: 'house_facade', section: 'welcome_mat' },

        // House Number Section
        { id: 'no_house_number', name: 'No Number', type: 'house_custom', zone: 'house_facade', section: 'house_number', isDefault: true },
        { id: 'classic_house_number', name: 'Classic Number', type: 'house_custom', zone: 'house_facade', section: 'house_number' },
        { id: 'modern_house_number', name: 'Modern Number', type: 'house_custom', zone: 'house_facade', section: 'house_number' },
        { id: 'rustic_house_number', name: 'Rustic Number', type: 'house_custom', zone: 'house_facade', section: 'house_number' },

        // Exterior Lights Section
        { id: 'no_exterior_lights', name: 'No Lights', type: 'house_custom', zone: 'house_facade', section: 'exterior_lights', isDefault: true },
        { id: 'lantern_lights', name: 'Lanterns', type: 'house_custom', zone: 'house_facade', section: 'exterior_lights' },
        { id: 'modern_lights', name: 'Modern Sconces', type: 'house_custom', zone: 'house_facade', section: 'exterior_lights' },
        { id: 'string_exterior_lights', name: 'String Lights', type: 'house_custom', zone: 'house_facade', section: 'exterior_lights' }
    ],
    templates: [
        { id: 'cottage_v1', name: 'Cottage', type: 'house_template', zone: 'house_facade' },
        { id: 'townhouse_v1', name: 'Townhouse', type: 'house_template', zone: 'house_facade' },
        { id: 'loft_v1', name: 'Modern Loft', type: 'house_template', zone: 'house_facade' },
        { id: 'cabin_v1', name: 'Log Cabin', type: 'house_template', zone: 'house_facade' }
    ],
    colors: [
        { id: 'wall_color', name: 'Wall Color', type: 'house_color', zone: 'house_facade', color: '#F5E9D4' },
        { id: 'roof_color', name: 'Roof Color', type: 'house_color', zone: 'house_facade', color: '#A18463' },
        { id: 'trim_color', name: 'Trim Color', type: 'house_color', zone: 'house_facade', color: '#2E4B3F' },
        { id: 'window_color', name: 'Window Color', type: 'house_color', zone: 'house_facade', color: '#8EC5E8' },
        { id: 'detail_color', name: 'Detail Color', type: 'house_color', zone: 'house_facade', color: '#4FAF6D' }
    ]
} as const

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
