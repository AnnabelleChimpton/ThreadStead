// How big one person's page source may be, checked on every save. Generous on
// purpose: the largest starter is about 28 KB of template and the presets
// about 12 KB of CSS, and big old-web pages fit (cameronsworld's CSS is about
// 500 KB). Pages render from a copy built at save, so size costs a visitor
// little.
export const MAX_TEMPLATE_CHARS = 500_000;
export const MAX_CSS_CHARS = 500_000;

/**
 * The request body the routes that take a page's source accept (their
 * `config`, which has to be written out in each). HTML and CSS both at the
 * cap, every character three bytes in UTF-8, fit with room for the JSON
 * around them; Next's default of 1 MB didn't. nginx's client_max_body_size
 * has to allow it too. page-source-routes.test.ts holds each route to it.
 */
export const PAGE_SOURCE_BODY_LIMIT = '4mb';

/** The error for a save over the limit, or null when it fits. */
export function sourceTooLong(kind: 'CSS' | 'template', text: unknown): string | null {
  const limit = kind === 'CSS' ? MAX_CSS_CHARS : MAX_TEMPLATE_CHARS;
  if (typeof text !== 'string' || text.length <= limit) return null;
  // Rounded up: just over the cap never reads as "200 KB; the most is 200 KB"
  const size = `${Math.ceil(text.length / 1000)} KB`;
  return `Your ${kind === 'CSS' ? 'CSS' : 'HTML'} is ${size}; the most is ${Math.round(limit / 1000)} KB. Trim it and save again.`;
}
