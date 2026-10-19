/**
 * The art a catalog item brings to every yard it's placed in: an optional
 * code-SVG override and an optional PNG with its stored size and frame
 * count. One select and one mapping, so every page that draws decorations
 * (the home, the editor, the street, ring neighborhoods, the share snapshot)
 * passes the same fields along.
 */
import type { DecorationArtSize } from './decoration-dimensions'

export const CATALOG_ART_SELECT = {
  itemId: true,
  renderSvg: true,
  pngUrl: true,
  width: true,
  height: true,
  frames: true,
} as const

export interface CatalogArtRow {
  itemId?: string
  renderSvg: string | null
  pngUrl: string | null
  width: number | null
  height: number | null
  frames: number | null
}

export interface CatalogArtFields extends DecorationArtSize {
  renderSvg?: string
  pngUrl?: string
}

/** Only the fields that are set, so a code-drawn item stays a plain object. */
export function catalogArtFields(row: CatalogArtRow | null | undefined): CatalogArtFields {
  if (!row) return {}
  const out: CatalogArtFields = {}
  if (row.renderSvg) out.renderSvg = row.renderSvg
  if (row.pngUrl) {
    out.pngUrl = row.pngUrl
    if (row.width && row.height) {
      out.pngWidth = row.width
      out.pngHeight = row.height
    }
    if (row.frames && row.frames > 1) out.pngFrames = row.frames
  }
  return out
}

/** itemId → art, for a page's worth of placed decorations. */
export function catalogArtMap<T extends CatalogArtRow & { itemId: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.itemId, row]))
}
