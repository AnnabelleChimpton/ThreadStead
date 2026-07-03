/**
 * Single source of truth for the site's base URL used when building
 * post/ring URIs for Ring Hub (submission and PostRef deletion).
 *
 * Both create.ts and delete.ts must resolve the same base URL, otherwise
 * URI-fallback deletion of hub PostRefs (which matches on the exact URI)
 * silently fails. The default matches the dev server (port 3000).
 */
export function getSiteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
