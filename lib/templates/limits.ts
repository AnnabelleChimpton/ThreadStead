// How big one person's page source may be, checked on every save. Generous on
// purpose: the largest starter is about 28 KB of template and the presets
// about 12 KB of CSS.
export const MAX_TEMPLATE_CHARS = 200_000;
export const MAX_CSS_CHARS = 200_000;

/** The error for a save over the limit, or null when it fits. */
export function sourceTooLong(kind: 'CSS' | 'template', text: unknown): string | null {
  const limit = kind === 'CSS' ? MAX_CSS_CHARS : MAX_TEMPLATE_CHARS;
  if (typeof text !== 'string' || text.length <= limit) return null;
  // Rounded up: just over the cap never reads as "200 KB; the most is 200 KB"
  const size = `${Math.ceil(text.length / 1000)} KB`;
  return `Your ${kind === 'CSS' ? 'CSS' : 'HTML'} is ${size}; the most is ${Math.round(limit / 1000)} KB. Trim it and save again.`;
}
