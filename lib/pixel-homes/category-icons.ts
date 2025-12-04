import { PixelIconName } from '@/components/ui/PixelIcon';

/**
 * Shared icon mapping for pixel home decoration categories
 * Uses pixelarticons for consistent styling across the editor
 */
export const DECORATION_CATEGORY_ICONS: Record<string, PixelIconName> = {
  // Main categories
  decor: 'paint-bucket',
  terrain: 'map',
  house: 'home',
  theme: 'paint-bucket',
  color: 'paint-bucket',
  sky: 'cloud-sun',
  text: 'script',

  // Decor subcategories
  plant: 'drop',
  furniture: 'archive',
  lighting: 'lightbulb',
  water: 'drop',
  structure: 'building',
  path: 'map',
  feature: 'zap',
  seasonal: 'gift',

  // House subcategories
  door: 'external-link',
  window: 'image',
  roof: 'buildings',
  foundation: 'building',
  wall: 'building',
  chimney: 'building',

  // Fallback
  default: 'archive',
};

/**
 * Get the icon name for a category, with fallback
 */
export function getCategoryIcon(category: string): PixelIconName {
  return DECORATION_CATEGORY_ICONS[category.toLowerCase()] || DECORATION_CATEGORY_ICONS.default;
}
