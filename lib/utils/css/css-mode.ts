/**
 * Single source of truth for resolving a profile's CSS mode: the profile-page
 * SSR, ProfileLayout and the editor's default-layout route all read it here,
 * so server and client never disagree about the same profile.
 *
 * The `cssMode` DB field alone decides; a missing or unknown value is
 * 'inherit'. ('inherit' and 'override' both mean site styles on, see
 * lib/domain/profile/layout.ts.) Older rows also carried the mode as a
 * comment at the top of the CSS; that comment no longer means anything.
 */
import type { CSSMode } from './layers'

const VALID_MODES: readonly CSSMode[] = ['inherit', 'override', 'disable']

export function resolveCSSMode(dbMode?: string | null): CSSMode {
  if (dbMode && (VALID_MODES as readonly string[]).includes(dbMode)) {
    return dbMode as CSSMode
  }
  return 'inherit'
}
