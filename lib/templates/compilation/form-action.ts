/**
 * Forms on resident pages may not post to the site's own /api/ routes. The
 * sanitizer (template-parser.ts) takes such an action out when a page is
 * saved, and the page tree (page-tree.ts) leaves it out again at render, for
 * pages saved before this rule.
 */

export const FORM_ACTION_REMOVED =
  "A <form> on a page can't send to the site's /api/ addresses, so its action was taken out.";

/**
 * Whether a form action lands on one of the site's /api/ routes, wherever
 * the page is shown. A form there would post with the visitor's cookies
 * (sign them out, claim things as them). Relative actions are resolved from
 * the site root, the shallowest place a page can sit, so `api/x` and
 * `../api/x` count; any host counts, since CSP form-action 'self' already
 * stops other hosts. The URL parser folds `\`, tabs and dot segments the way
 * browsers do; %-escapes are decoded so `/%61pi/` counts too.
 */
export function postsToApi(action: unknown): boolean {
  if (typeof action !== 'string') return false;
  let path: string;
  try {
    path = new URL(action, 'https://site.invalid/').pathname;
  } catch {
    return false;
  }
  try {
    path = decodeURIComponent(path);
  } catch {
    // a broken %-escape: check it as written
  }
  return /^\/+api(\/|$)/i.test(path);
}

/**
 * The host a form sends to when that's another site (`https://x/…`, `//x/…`).
 * CSP form-action 'self' stops it posting, whatever the path.
 */
export function offSiteHost(action: unknown): string | undefined {
  if (typeof action !== 'string' || !/^\s*(?:https?:)?\/\//i.test(action)) return undefined;
  try {
    return new URL(action.trim(), 'https://site.invalid/').hostname || undefined;
  } catch {
    return undefined;
  }
}
