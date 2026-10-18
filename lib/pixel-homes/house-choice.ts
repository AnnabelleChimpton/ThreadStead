/**
 * The house a visitor picks: on the homepage demo, carried into signup, and
 * saved to their UserHomeConfig when signup finishes.
 */
import type { HouseTemplate, ColorPalette } from '@/components/pixel-homes/HouseSVG';
import type { ProfileTemplateType } from '@/lib/templates/default-profile-templates';

export interface HouseChoice {
  template: HouseTemplate;
  palette: ColorPalette;
}

export const HOUSE_TEMPLATES: Array<{ id: HouseTemplate; name: string }> = [
  { id: 'cottage_v1', name: 'Cottage' },
  { id: 'townhouse_v1', name: 'Townhouse' },
  { id: 'loft_v1', name: 'Loft' },
  { id: 'cabin_v1', name: 'Cabin' },
];

// Same names the house settings use
export const HOUSE_PALETTES: Array<{ id: ColorPalette; name: string }> = [
  { id: 'thread_sage', name: 'Thread Sage' },
  { id: 'charcoal_nights', name: 'Charcoal Nights' },
  { id: 'pixel_petals', name: 'Pixel Petals' },
  { id: 'crt_glow', name: 'CRT Glow' },
  { id: 'classic_linen', name: 'Classic Linen' },
];

export const DEFAULT_HOUSE_CHOICE: HouseChoice = { template: 'cottage_v1', palette: 'thread_sage' };

// Profile page theme that goes with each house palette
export const PAGE_THEME_FOR_PALETTE: Record<ColorPalette, ProfileTemplateType> = {
  thread_sage: 'classic-linen',
  charcoal_nights: 'charcoal-nights',
  pixel_petals: 'pixel-petals',
  crt_glow: 'retro-social',
  classic_linen: 'classic-linen',
};

export function isHouseTemplate(value: unknown): value is HouseTemplate {
  return HOUSE_TEMPLATES.some((t) => t.id === value);
}

export function isColorPalette(value: unknown): value is ColorPalette {
  return HOUSE_PALETTES.some((p) => p.id === value);
}

/** A valid choice from loose input (query params, storage), or null. */
export function parseHouseChoice(house: unknown, palette: unknown): HouseChoice | null {
  return isHouseTemplate(house) && isColorPalette(palette) ? { template: house, palette } : null;
}

export function houseChoiceQuery(choice: HouseChoice): string {
  return `house=${choice.template}&palette=${choice.palette}`;
}

// Survives the signup steps between the demo and the house step
const STORAGE_KEY = 'ts-house-choice';

export function saveHouseChoice(choice: HouseChoice): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Storage unavailable: the query param still carries it
  }
}

export function readHouseChoice(): HouseChoice | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    return parseHouseChoice(saved?.template, saved?.palette);
  } catch {
    return null;
  }
}

export function clearHouseChoice(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear
  }
}
