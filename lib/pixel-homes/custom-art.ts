/**
 * A resident's own pixel art: five slots on UserHomeConfig.customAssets, and
 * placed copies that point at a slot (decorationId `custom_asset_<slot>`),
 * never at a file. Replacing a slot's image updates every placed copy, and
 * removing it removes them from the picture.
 *
 * Older placed copies also stored the file's URL in `data`; it is ignored,
 * because a replaced slot's old file is deleted.
 */
export const CUSTOM_SLOTS = 5

const CUSTOM_ASSET_ID = /^custom_asset_([0-4])$/

/** The slot a placed copy points at, from its decorationId; null for catalog items. */
export function customSlotOf(decorationId: string): number | null {
  const match = CUSTOM_ASSET_ID.exec(decorationId)
  return match ? Number(match[1]) : null
}

/** Slot URLs by slot number, from the stored `customAssets` JSON. */
export function customSlotUrls(customAssets: unknown): (string | null)[] {
  const urls: (string | null)[] = Array.from({ length: CUSTOM_SLOTS }, () => null)
  if (!Array.isArray(customAssets)) return urls
  for (const entry of customAssets) {
    const { slot, url } = (entry ?? {}) as { slot?: unknown; url?: unknown }
    if (typeof slot === 'number' && Number.isInteger(slot) && slot >= 0 && slot < CUSTOM_SLOTS && typeof url === 'string' && url) {
      urls[slot] = url
    }
  }
  return urls
}

/** The image a placed copy shows, or null (an empty slot, or not custom art). */
export function customArtUrl(decorationId: string, slotUrls: (string | null)[]): string | null {
  const slot = customSlotOf(decorationId)
  return slot === null ? null : slotUrls[slot] ?? null
}
