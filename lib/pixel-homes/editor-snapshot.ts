/**
 * A comparable string for everything the pixel-home editor saves. Two
 * snapshots are equal exactly when saving would change nothing, so
 * "unsaved changes" is `snapshot !== savedSnapshot`. Covers decorations,
 * terrain, house parts and colours, theme, sky and text, unlike undo
 * history, which only tracks decorations.
 *
 * A stopgap until the editor keeps one document in a reducer (pixel-homes
 * PLAN.md, Phase 3), which can compare documents directly.
 */
import type { DecorationItem } from './decoration-data'

export interface EditorDocument {
  decorations: DecorationItem[]
  houseCustomizations: object
  atmosphere: object
  template: string
  palette: string
  terrain: Record<string, string>
}

/** null, undefined and '' all mean "not set" in a saved home. */
function isUnset(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

/** JSON with sorted keys and unset values dropped, so key order and null-vs-missing don't count as edits. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => !isUnset(v))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

export function editorSnapshot(doc: EditorDocument): string {
  return stableStringify({
    // Only what the save sends: selection, layer and catalog fields don't count
    decorations: doc.decorations.map((d) => ({
      id: d.decorationId || d.id,
      type: d.type,
      x: Math.round(d.position?.x ?? 0),
      y: Math.round(d.position?.y ?? 0),
      variant: d.variant || 'default',
      size: d.size || 'medium',
      text: d.text ?? d.data?.text,
      slot: d.slot,
      art: d.customAssetUrl,
    })),
    house: doc.houseCustomizations,
    atmosphere: doc.atmosphere,
    template: doc.template,
    palette: doc.palette,
    terrain: doc.terrain,
  })
}
