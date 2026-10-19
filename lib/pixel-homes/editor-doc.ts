/**
 * The pixel-home editor's document: everything a save sends, kept in one
 * value with one undo history (pixel-homes PLAN.md, Phase 3 step 1).
 *
 *  - Every edit (decorations, terrain, house parts and colours, theme, sky,
 *    text) is one undo step. A terrain stroke is one step however many cells
 *    it paints, and typing in a field or dragging a colour is one step.
 *  - "Unsaved" means the document differs from the last save, compared with
 *    `docKey`, so undoing back to the saved home is clean again.
 *  - `docFromProps` and `toSavePayload` are the only ways in and out, so the
 *    load → edit → save round trip has one place to test.
 */
import type { DecorationItem } from './decoration-data'
import type { AtmosphereSettings, ColorPalette, HouseCustomizations, HouseTemplate } from '../../components/pixel-homes/HouseSVG'

export interface EditorDoc {
  decorations: DecorationItem[]
  terrain: Record<string, string>
  house: HouseCustomizations
  atmosphere: AtmosphereSettings
  template: HouseTemplate
  palette: ColorPalette
}

export interface EditorState {
  past: EditorDoc[]
  present: EditorDoc
  future: EditorDoc[]
  /** The last saved document. */
  saved: EditorDoc
  /** The document when the open stroke began; its edits become one step when it ends. */
  strokeBase: EditorDoc | null
  /** Edits carrying the same merge key in a row become one step. */
  mergeKey: string | null
}

type Position = NonNullable<DecorationItem['position']>

export type EditorAction =
  | { type: 'place'; decoration: DecorationItem }
  | { type: 'move'; id: string; position: Position }
  | { type: 'updateDecoration'; id: string; changes: Partial<DecorationItem>; mergeKey?: string }
  | { type: 'remove'; ids: Iterable<string> }
  | { type: 'setHouse'; changes: Partial<HouseCustomizations>; mergeKey?: string }
  | { type: 'setAtmosphere'; changes: Partial<AtmosphereSettings> }
  | { type: 'setTheme'; template: HouseTemplate; palette: ColorPalette }
  | { type: 'beginStroke' }
  | { type: 'paintCell'; key: string; tile: string | null }
  | { type: 'endStroke' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'saved'; doc: EditorDoc }

/** Undo steps kept; older ones drop off. */
export const HISTORY_LIMIT = 100

export const DEFAULT_HOUSE: HouseCustomizations = { windowStyle: 'default', doorStyle: 'default', roofTrim: 'default' }
export const DEFAULT_ATMOSPHERE: AtmosphereSettings = { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' }

// ------------------------------------------------------------ comparing --

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

/**
 * A comparable string for what saving `doc` would store. Two documents with
 * the same key save the same home: selection, layer (recomputed on load),
 * sub-pixel positions and catalog fields don't count.
 */
export function docKey(doc: EditorDoc): string {
  return stableStringify({
    decorations: doc.decorations.map((d) => ({
      id: catalogId(d),
      type: d.type,
      x: Math.round(d.position?.x ?? 0),
      y: Math.round(d.position?.y ?? 0),
      variant: d.variant || 'default',
      size: d.size || 'medium',
      text: decorationText(d),
      slot: d.slot,
      art: d.customAssetUrl,
    })),
    house: doc.house,
    atmosphere: doc.atmosphere,
    template: doc.template,
    palette: doc.palette,
    terrain: doc.terrain,
  })
}

export function isDirty(state: EditorState): boolean {
  return docKey(state.present) !== docKey(state.saved)
}

// --------------------------------------------------------------- reducer --

export function createEditorState(doc: EditorDoc): EditorState {
  return { past: [], present: doc, future: [], saved: doc, strokeBase: null, mergeKey: null }
}

/** Apply an edit: a new undo step, or folded into the open stroke or merge. */
function edit(state: EditorState, next: EditorDoc, mergeKey?: string): EditorState {
  if (next === state.present) return state
  if (state.strokeBase) return { ...state, present: next, future: [] }
  if (mergeKey && mergeKey === state.mergeKey) return { ...state, present: next, future: [] }
  return {
    ...state,
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    mergeKey: mergeKey ?? null,
  }
}

/** Close an open stroke: one undo step if it changed anything, none if not. */
function endStroke(state: EditorState): EditorState {
  const base = state.strokeBase
  if (!base) return state
  const changed = base !== state.present && docKey(base) !== docKey(state.present)
  if (!changed) return { ...state, present: base, strokeBase: null }
  return {
    ...state,
    past: [...state.past, base].slice(-HISTORY_LIMIT),
    future: [],
    strokeBase: null,
    mergeKey: null,
  }
}

function withDecorations(doc: EditorDoc, decorations: DecorationItem[]): EditorDoc {
  return { ...doc, decorations }
}

function changesSomething<T extends object>(current: T, changes: Partial<T>): boolean {
  return Object.entries(changes).some(([key, value]) => (current as Record<string, unknown>)[key] !== value)
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const doc = state.present
  switch (action.type) {
    case 'place':
      return edit(state, withDecorations(doc, [...doc.decorations, action.decoration]))

    case 'move': {
      const current = doc.decorations.find((d) => d.id === action.id)
      if (!current) return state
      const { x, y, layer } = action.position
      if (current.position?.x === x && current.position?.y === y && current.position?.layer === layer) return state
      return edit(state, withDecorations(doc, doc.decorations.map((d) => (d.id === action.id ? { ...d, position: action.position } : d))))
    }

    case 'updateDecoration': {
      const current = doc.decorations.find((d) => d.id === action.id)
      if (!current || !changesSomething(current, action.changes)) return state
      const decorations = doc.decorations.map((d) => (d.id === action.id ? { ...d, ...action.changes } : d))
      return edit(state, withDecorations(doc, decorations), action.mergeKey)
    }

    case 'remove': {
      const ids = new Set(action.ids)
      const decorations = doc.decorations.filter((d) => !ids.has(d.id))
      if (decorations.length === doc.decorations.length) return state
      return edit(state, withDecorations(doc, decorations))
    }

    case 'setHouse':
      if (!changesSomething(doc.house, action.changes)) return state
      return edit(state, { ...doc, house: { ...doc.house, ...action.changes } }, action.mergeKey)

    case 'setAtmosphere':
      if (!changesSomething(doc.atmosphere, action.changes)) return state
      return edit(state, { ...doc, atmosphere: { ...doc.atmosphere, ...action.changes } })

    case 'setTheme':
      if (doc.template === action.template && doc.palette === action.palette) return state
      return edit(state, { ...doc, template: action.template, palette: action.palette })

    case 'beginStroke':
      if (state.strokeBase) return state
      return { ...state, strokeBase: doc, mergeKey: null }

    case 'paintCell': {
      const current = doc.terrain[action.key]
      if (action.tile === null ? current === undefined : current === action.tile) return state
      const terrain = { ...doc.terrain }
      if (action.tile === null) delete terrain[action.key]
      else terrain[action.key] = action.tile
      return edit(state, { ...doc, terrain })
    }

    case 'endStroke':
      return endStroke(state)

    case 'undo': {
      const s = endStroke(state)
      if (s.past.length === 0) return s
      return {
        ...s,
        past: s.past.slice(0, -1),
        present: s.past[s.past.length - 1],
        future: [s.present, ...s.future],
        mergeKey: null,
      }
    }

    case 'redo': {
      const s = endStroke(state)
      if (s.future.length === 0) return s
      return {
        ...s,
        past: [...s.past, s.present],
        present: s.future[0],
        future: s.future.slice(1),
        mergeKey: null,
      }
    }

    case 'saved':
      // The next edit starts a fresh step, so undo can always reach the saved home
      return { ...state, saved: action.doc, mergeKey: null }
  }
}

export function canUndo(state: EditorState): boolean {
  return state.past.length > 0 || (state.strokeBase !== null && state.strokeBase !== state.present)
}

export function canRedo(state: EditorState): boolean {
  return state.future.length > 0
}

// ------------------------------------------------------------ in and out --

/** A placed decoration's catalog item id (`roses_red`, `custom_asset_2`). */
export function catalogId(d: DecorationItem): string {
  return d.decorationId || d.id
}

/** A sign's text, wherever an older copy kept it. */
export function decorationText(d: DecorationItem): string | undefined {
  const text = d.text ?? d.data?.text
  return typeof text === 'string' ? text : undefined
}

/**
 * A new copy of a palette item at `position`. The instance id only has to be
 * unique; the catalog id travels separately, so ids ending in digits
 * (`fence_2`) are never parsed back out of it.
 */
export function newPlacement(
  item: DecorationItem,
  position: Position,
  uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
): DecorationItem {
  const decorationId = catalogId(item)
  return {
    ...item,
    id: `${decorationId}_${uniqueSuffix}`,
    decorationId,
    position,
    variant: item.variant || 'default',
    size: item.size || 'medium',
  }
}

export interface EditorDocInput {
  template: HouseTemplate
  palette: ColorPalette
  decorations?: DecorationItem[]
  house?: HouseCustomizations | null
  atmosphere?: AtmosphereSettings | null
  terrain?: Record<string, string> | null
}

/** The editor's starting document from the decorate page's props. */
export function docFromProps(input: EditorDocInput): EditorDoc {
  return {
    decorations: (input.decorations ?? []).map((d) => ({
      ...d,
      decorationId: catalogId(d),
      text: decorationText(d),
    })),
    terrain: input.terrain ?? {},
    house: input.house ?? DEFAULT_HOUSE,
    atmosphere: input.atmosphere ?? DEFAULT_ATMOSPHERE,
    template: input.template,
    palette: input.palette,
  }
}

/** A decoration's stored `data`: custom-art slot, or sign text over whatever else it carried. */
function saveData(d: DecorationItem): Record<string, unknown> | null {
  if (d.type === 'custom') return { customAssetUrl: d.customAssetUrl, slot: d.slot }
  const { text: _oldText, ...rest } = (d.data && typeof d.data === 'object' ? d.data : {}) as Record<string, unknown>
  const text = decorationText(d)
  if (text) return { ...rest, text }
  return Object.keys(rest).length > 0 ? rest : null
}

/** The body POST /api/home/decorations/save takes for `doc`. */
export function toSavePayload(doc: EditorDoc) {
  return {
    decorations: doc.decorations.map((d) => ({
      decorationType: d.type,
      decorationId: catalogId(d),
      zone: d.zone || 'front_yard',
      positionX: Math.round(d.position?.x ?? 0),
      positionY: Math.round(d.position?.y ?? 0),
      layer: d.position?.layer || 1,
      variant: d.variant || 'default',
      size: d.size || 'medium',
      data: saveData(d),
    })),
    // Cleared fields go as null: a missing key leaves the stored value alone,
    // so a reset colour or a removed house number would never stick.
    houseCustomizations: Object.fromEntries(Object.entries(doc.house).map(([key, value]) => [key, value ?? null])),
    atmosphere: doc.atmosphere,
    template: doc.template,
    palette: doc.palette,
    terrain: doc.terrain,
  }
}

export type SavePayload = ReturnType<typeof toSavePayload>
