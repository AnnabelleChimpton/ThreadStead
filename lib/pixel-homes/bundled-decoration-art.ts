/**
 * Default pixel art for catalogue decorations that have no PNG of their
 * own yet, shipped with the site in public/pixel-homes/decorations/.
 *
 * Each is drawn at the size DECORATION_DIMENSIONS already gives it, so
 * swapping it in moves nothing in anyone's yard. A PNG uploaded through
 * admin (the item's pngUrl) always wins; to change one of these, upload a
 * new PNG for that item, or replace the file here.
 */
import { normalizeDecorationId } from './decoration-assets'

export const BUNDLED_DECORATION_ART = new Set([
  // Plants
  'roses_yellow', 'daisies_purple', 'flower_pot', 'hedge', 'hedge_round', 'potted_herbs',
  // Features
  'wind_chimes', 'garden_sphere', 'sundial', 'garden_gnome_fishing', 'garden_gnome_reading',
  'watering_can', 'garden_tools', 'sleeping_cat', 'sleeping_dog', 'bird_feeder',
  'firewood_stack', 'clothesline', 'welcome_sign',
  // Furniture
  'garden_bench', 'planter_box_furniture', 'picnic_table', 'compost_bin', 'rocking_chair',
  'garden_swing', 'cozy_blanket',
  // Paths
  'brick_path', 'stepping_stones', 'gravel_path',
  // Lighting
  'garden_lantern', 'string_lights', 'torch', 'spotlight',
  // Water
  'fountain', 'pond', 'rain_barrel',
  // Structures
  'sign_post', 'gazebo', 'trellis', 'garden_arch', 'picket_fence_white',
  'picket_fence_natural', 'rustic_fence', 'stone_wall', 'wishing_well',
  // Seasonal
  'pumpkin',
])

/** The site's own PNG for a decoration, or null when it only has the code-drawn SVG. */
export function bundledDecorationPngUrl(decorationId: string): string | null {
  const id = normalizeDecorationId(decorationId)
  return BUNDLED_DECORATION_ART.has(id) ? `/pixel-homes/decorations/${id}.png` : null
}
