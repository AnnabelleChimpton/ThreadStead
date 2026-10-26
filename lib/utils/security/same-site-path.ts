/**
 * A ?next= to go to after signing in, only when it stays on this site: the
 * path, query and fragment, or null. Read the way the browser will read it,
 * so tricks a pattern check misses don't get through: the browser drops tabs
 * and newlines and reads "\" as "/", so "/\t/evil.com" and "/\evil.com"
 * both mean //evil.com, another site.
 */
export function sameSitePath(next: string, origin: string): string | null {
  if (!next.startsWith('/')) return null;
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}
