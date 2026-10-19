// How big one person's page source may be, checked on every save. Generous on
// purpose: the largest starter is about 28 KB of template and the presets
// about 12 KB of CSS.
export const MAX_TEMPLATE_CHARS = 200_000;
export const MAX_CSS_CHARS = 200_000;

/** The error for a save over the limit, or null when it fits. */
export function sourceTooLong(kind: 'CSS' | 'template', text: unknown): string | null {
  const limit = kind === 'CSS' ? MAX_CSS_CHARS : MAX_TEMPLATE_CHARS;
  if (typeof text !== 'string' || text.length <= limit) return null;
  return `Your ${kind} is over ${Math.round(limit / 1000)} KB. Trim it and save again.`;
}
