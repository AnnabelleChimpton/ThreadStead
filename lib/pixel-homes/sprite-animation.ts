/**
 * The animation budget (art-direction §3.5): frame strips step at 200 ms a
 * frame, and at most three play at once on a home. The rest hold frame one.
 */

/** Most animated sprites one home plays at once. */
export const MAX_ANIMATED_SPRITES = 3
/** 200 ms a frame: inside the bible's 150–250 ms, never eased. */
export const SPRITE_FRAME_MS = 200

interface MaybeAnimated {
  id: string
  pngUrl?: string | null
  pngFrames?: number | null
}

/** The first MAX_ANIMATED_SPRITES frame strips, in the order the yard stores them. */
export function animatedSpriteIds(decorations: MaybeAnimated[], max = MAX_ANIMATED_SPRITES): Set<string> {
  const ids = new Set<string>()
  for (const d of decorations) {
    if (ids.size >= max) break
    if (d.pngUrl && d.pngFrames && d.pngFrames > 1) ids.add(d.id)
  }
  return ids
}
