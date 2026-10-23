/**
 * A ring's theme colour: the accent its page's pine text, fills and borders
 * take. The choices are the ring badge palettes, so a ring's page and badge
 * match, each dark enough to read on the page's paper. Pine is the site's own.
 */
export const RING_THEMES = [
  { id: 'pine', name: 'Pine', hex: '#2e4b3f' },
  { id: 'moss', name: 'Moss', hex: '#49722e' },
  { id: 'sky', name: 'Sky', hex: '#3f5f7a' },
  { id: 'lavender', name: 'Lavender', hex: '#5a4fb3' },
  { id: 'rose', name: 'Rose', hex: '#8c4a5b' },
  { id: 'brick', name: 'Brick', hex: '#c4473a' },
  { id: 'wood', name: 'Wood', hex: '#834a27' },
] as const;

// What the settings form saved before it saved colours
const LEGACY_IDS: Record<string, string> = {
  'thread-pine': '#2e4b3f',
  'thread-sage': '#49722e',
  'thread-clay': '#834a27',
  'thread-stone': '#3f5f7a',
  'thread-ocean': '#3f5f7a',
  'thread-berry': '#8c4a5b',
};

/**
 * The colour a stored theme means: a #rgb/#rrggbb as saved, or an old theme
 * id. null for anything else, so nothing but a colour ever reaches the page's
 * stylesheet.
 */
export function ringThemeHex(value: string | null | undefined): string | null {
  const theme = value?.trim().toLowerCase() ?? '';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(theme)) return theme;
  return LEGACY_IDS[theme] ?? null;
}
