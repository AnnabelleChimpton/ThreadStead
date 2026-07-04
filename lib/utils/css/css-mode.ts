/**
 * Single source of truth for resolving a profile's CSS mode.
 *
 * Before this existed there were THREE divergent resolvers: the profile-page
 * SSR read only the DB field, ProfileModeRenderer read only the legacy
 * `/* CSS_MODE:x *\/` comment (ignoring the DB), and ProfileLayout read the
 * comment with the prop as fallback — so server and client could disagree
 * about the same profile (a hydration-mismatch and "flaky CSS" source).
 *
 * Resolution order:
 *  1. Legacy `/* CSS_MODE:x *\/` comment embedded in the stored CSS (older
 *     rows saved the mode this way; the comment wins so those rows keep
 *     behaving as they always did).
 *  2. The `cssMode` DB field (what the CSS editor writes today).
 *  3. 'inherit'.
 */
import type { CSSMode } from './layers'

const VALID_MODES: readonly CSSMode[] = ['inherit', 'override', 'disable']

export function resolveCSSMode(
  dbMode?: string | null,
  customCSS?: string | null
): CSSMode {
  const commentMatch = customCSS?.match(/\/\* CSS_MODE:(\w+) \*\//)
  if (commentMatch && (VALID_MODES as readonly string[]).includes(commentMatch[1])) {
    return commentMatch[1] as CSSMode
  }
  if (dbMode && (VALID_MODES as readonly string[]).includes(dbMode)) {
    return dbMode as CSSMode
  }
  return 'inherit'
}
