import { BADGE_PALETTES, BADGE_PALETTE_IDS, autoPalette, type BadgePaletteId } from '@/lib/rings/badge-art';

/**
 * A ring's theme colour: the accent its page's pine text, fills and borders
 * take, and the palette its drawn badge is in. The choices are the ring
 * badge palettes (one table, in badge-art.ts) that are dark enough to read
 * on the page's paper. Pine is the site's own.
 */
export const RING_THEMES = BADGE_PALETTE_IDS.filter((id) => BADGE_PALETTES[id].theme).map((id) => ({
  id,
  name: BADGE_PALETTES[id].name,
  hex: BADGE_PALETTES[id].field,
}));

// What the settings form saved before it saved colours
const LEGACY_IDS: Record<string, string> = {
  'thread-pine': BADGE_PALETTES.pine.field,
  'thread-sage': BADGE_PALETTES.moss.field,
  'thread-clay': BADGE_PALETTES.wood.field,
  'thread-stone': BADGE_PALETTES.sky.field,
  'thread-ocean': BADGE_PALETTES.sky.field,
  'thread-berry': BADGE_PALETTES.rose.field,
};

/**
 * The colour a stored theme means: a #rgb/#rrggbb as saved, or an old theme
 * id. null for anything else, so nothing but a colour ever reaches the page's
 * stylesheet.
 */
export function ringThemeHex(value: unknown): string | null {
  const theme = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(theme)) return theme;
  return LEGACY_IDS[theme] ?? null;
}

/** The palette a ring's drawn badge is in: its theme colour's, or one its slug picks when it has none. */
export function ringBadgePalette(themeColor: unknown, slug: string): BadgePaletteId {
  const hex = ringThemeHex(themeColor);
  return BADGE_PALETTE_IDS.find((id) => BADGE_PALETTES[id].field === hex) ?? autoPalette(slug);
}

/**
 * The colour a ring's page is in. One choice with its badge: the theme colour
 * when it has one, else the palette its slug picks (never butter, too light
 * for text), so a ring without a theme still matches its default badge.
 */
export function ringAccentHex(themeColor: unknown, slug: string): string {
  return ringThemeHex(themeColor) ?? BADGE_PALETTES[ringBadgePalette(themeColor, slug)].field;
}
