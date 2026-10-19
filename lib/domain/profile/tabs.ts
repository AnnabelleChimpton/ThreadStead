// The standard profile layout's tabs a resident may hide from Settings > Your
// page. Blog always shows, so a page never ends up with no tabs.
export const HIDEABLE_TABS = [
  { id: 'media', label: 'Media' },
  { id: 'friends', label: 'Friends / Websites' },
  { id: 'badges', label: 'Badges' },
  { id: 'guestbook', label: 'Guestbook' },
] as const;

export type HideableTab = (typeof HIDEABLE_TABS)[number]['id'];

const IDS = new Set<string>(HIDEABLE_TABS.map((t) => t.id));

/** The hideable tab ids in a request body, deduplicated; anything else is dropped. */
export function cleanHiddenTabs(value: unknown): HideableTab[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is HideableTab => typeof v === 'string' && IDS.has(v)))];
}
