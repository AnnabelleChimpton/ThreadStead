/**
 * Where "Start from this page" goes: the viewer's own HTML editor with
 * ?from=<handle> (see startFromPage in shared-source.ts). Signed-out viewers
 * sign in first; a signed-in account with no handle yet finishes onboarding.
 * Kept apart from shared-source.ts so pages can use it client-side without
 * pulling in the database.
 */
export function startFromHref(viewerUsername: string | null | undefined, signedIn: boolean, from: string): string {
  if (!signedIn) return "/login";
  if (!viewerUsername) return "/onboarding";
  return `/resident/${encodeURIComponent(viewerUsername)}/template-editor?from=${encodeURIComponent(from)}`;
}
