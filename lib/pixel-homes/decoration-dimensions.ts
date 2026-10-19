/**
 * How big a decoration is, in art px.
 *
 * A PNG uploaded through admin carries its own size (DecorationItem
 * width/height, passed along as pngWidth/pngHeight), and that always wins.
 * The table below is the fallback for the code-drawn SVGs and for PNGs
 * uploaded before sizes were stored (art-direction T5).
 *
 * The height matters most: the bottom edge is where a decoration stands,
 * which is what depth sorting reads.
 */

export interface DecorationDimensions {
  width: number;
  height: number;
}

/**
 * Comprehensive mapping of decoration IDs to their actual pixel dimensions.
 * Dimensions are base values before size scaling is applied.
 */
export const DECORATION_DIMENSIONS: Record<string, DecorationDimensions> = {
  // === Plants ===
  'roses_red': { width: 24, height: 24 },
  'roses_pink': { width: 24, height: 24 },
  'roses_white': { width: 24, height: 24 },
  'roses_yellow': { width: 24, height: 24 },
  'daisies_white': { width: 20, height: 20 },
  'daisies_yellow': { width: 20, height: 20 },
  'daisies_purple': { width: 20, height: 20 },
  'tree_oak': { width: 32, height: 40 },
  'tree_pine': { width: 20, height: 44 },
  'small_tree': { width: 32, height: 40 },
  'sunflowers': { width: 28, height: 36 },
  'lavender': { width: 24, height: 32 },
  'flower_pot': { width: 18, height: 22 },
  'hedge': { width: 48, height: 24 },
  'hedge_round': { width: 32, height: 32 },
  'potted_herbs': { width: 16, height: 16 },

  // === Features ===
  'bird_bath': { width: 24, height: 32 },
  'garden_gnome': { width: 16, height: 24 },
  'decorative_fence': { width: 48, height: 20 },
  'wind_chimes': { width: 16, height: 28 },
  'flamingo': { width: 16, height: 32 },
  'garden_sphere': { width: 20, height: 24 },
  'sundial': { width: 24, height: 20 },
  'garden_gnome_fishing': { width: 24, height: 28 },
  'garden_gnome_reading': { width: 20, height: 28 },
  'watering_can': { width: 24, height: 20 },
  'garden_tools': { width: 20, height: 28 },
  'wheelbarrow': { width: 32, height: 24 },
  // Cozy additions
  'sleeping_cat': { width: 16, height: 12 },
  'sleeping_dog': { width: 20, height: 14 },
  'bird_feeder': { width: 16, height: 28 },
  'firewood_stack': { width: 24, height: 16 },
  'clothesline': { width: 48, height: 24 },
  'welcome_sign': { width: 20, height: 24 },

  // === Furniture ===
  'garden_bench': { width: 48, height: 24 },
  'outdoor_table': { width: 32, height: 32 },
  'mailbox': { width: 20, height: 32 },
  'planter_box': { width: 32, height: 20 },
  'planter_box_furniture': { width: 32, height: 20 },
  'picnic_table': { width: 40, height: 28 },
  'raised_bed': { width: 40, height: 24 },
  'compost_bin': { width: 24, height: 28 },
  'garden_cart': { width: 36, height: 24 },
  // Cozy additions
  'rocking_chair': { width: 24, height: 28 },
  'garden_swing': { width: 32, height: 36 },
  'cozy_blanket': { width: 24, height: 12 },

  // === Paths ===
  'stone_path': { width: 48, height: 16 },
  'brick_path': { width: 48, height: 12 },
  'stepping_stones': { width: 36, height: 24 },
  'gravel_path': { width: 40, height: 16 },

  // === Lighting ===
  'garden_lantern': { width: 16, height: 32 },
  'string_lights': { width: 64, height: 16 },
  'torch': { width: 12, height: 36 },
  'spotlight': { width: 20, height: 24 },

  // === Water ===
  'fountain': { width: 32, height: 32 },
  'pond': { width: 40, height: 24 },
  'rain_barrel': { width: 20, height: 32 },

  // === Structures ===
  'sign_post': { width: 32, height: 32 },
  'gazebo': { width: 48, height: 48 },
  'trellis': { width: 32, height: 48 },
  'garden_arch': { width: 40, height: 48 },
  'picket_fence_white': { width: 48, height: 24 },
  'picket_fence_natural': { width: 48, height: 24 },
  'rustic_fence': { width: 48, height: 24 },
  'stone_wall': { width: 48, height: 20 },
  'wishing_well': { width: 28, height: 32 },

  // === Seasonal ===
  'pumpkin': { width: 20, height: 20 },
};

/**
 * Default dimensions by decoration type.
 * Used as fallback when a specific decoration ID is not found.
 */
export const DEFAULT_TYPE_DIMENSIONS: Record<string, DecorationDimensions> = {
  'plant': { width: 16, height: 16 },
  'path': { width: 32, height: 8 },
  'feature': { width: 20, height: 20 },
  'seasonal': { width: 16, height: 16 },
  'furniture': { width: 24, height: 24 },
  'lighting': { width: 16, height: 16 },
  'water': { width: 24, height: 24 },
  'structure': { width: 32, height: 32 },
  'custom': { width: 64, height: 64 },
};

/**
 * Size variants as whole-number scales, so pixel art never resamples
 * (art-direction T6). Small used to be 0.7×, which dropped pixels; it now
 * shows at 1×. Nothing in the editor sets a size, so every placed item is
 * medium.
 */
export const SIZE_MULTIPLIERS: Record<string, number> = {
  'small': 1,
  'medium': 1,
  'large': 2,
};

export type DecorationSize = 'small' | 'medium' | 'large';

export function sizeScale(size: string | null | undefined): number {
  return SIZE_MULTIPLIERS[size || 'medium'] ?? 1;
}

/** A catalog PNG's own size, as the scene items carry it. */
export interface DecorationArtSize {
  pngUrl?: string | null;
  pngWidth?: number | null;
  pngHeight?: number | null;
  pngFrames?: number | null;
}

/**
 * Get the actual pixel dimensions for a decoration.
 *
 * @param decorationId - The ID of the decoration (e.g., 'tree_oak', 'roses_red')
 * @param decorationType - The type of decoration (e.g., 'plant', 'feature')
 * @param size - The size variant ('small', 'medium', 'large')
 * @param art - The item's PNG and its stored size, when it has one
 * @returns The scaled pixel dimensions { width, height }
 */
export function getDecorationDimensions(
  decorationId: string,
  decorationType: string,
  size: DecorationSize = 'medium',
  art?: DecorationArtSize | null
): DecorationDimensions {
  const fromArt = art?.pngUrl && art.pngWidth && art.pngHeight
    ? { width: art.pngWidth, height: art.pngHeight }
    : null;
  // A catalog id as given ('fence_2' is its own item), else an older
  // instance id with its suffix stripped ('tree_oak_123_abc' -> 'tree_oak')
  const baseDimensions = fromArt
    || DECORATION_DIMENSIONS[decorationId]
    || DECORATION_DIMENSIONS[decorationId.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')]
    || DEFAULT_TYPE_DIMENSIONS[decorationType]
    || { width: 16, height: 16 };

  const multiplier = sizeScale(size);

  return {
    width: baseDimensions.width * multiplier,
    height: baseDimensions.height * multiplier,
  };
}

/** A placed item's size: its own PNG size if it has one, else the table. */
export function itemDimensions(
  item: { id: string; decorationId?: string; type: string; size?: string | null } & DecorationArtSize
): DecorationDimensions {
  return getDecorationDimensions(item.decorationId || item.id, item.type, (item.size || 'medium') as DecorationSize, item);
}
