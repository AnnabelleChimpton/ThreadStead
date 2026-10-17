import { publicEnv } from './public-env';

/**
 * The site's public base URL — the one way to read NEXT_PUBLIC_BASE_URL.
 * Safe on client and server.
 *
 * Used for canonical/OG URLs, email links, and the post/ring URIs sent to
 * Ring Hub. create.ts and delete.ts must resolve the same base URL, otherwise
 * URI-fallback deletion of hub PostRefs (which matches on the exact URI)
 * silently fails — so the value is returned exactly as configured (no
 * trailing-slash normalization: that would change every URI already on the
 * hub). The fallback matches the dev server (port 3000).
 */
export function getSiteBaseUrl(): string {
  return publicEnv.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
}
