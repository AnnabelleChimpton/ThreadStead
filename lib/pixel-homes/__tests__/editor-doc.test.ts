import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  createEditorState,
  docFromProps,
  docKey,
  editorReducer,
  isDirty,
  newPlacement,
  toSavePayload,
  type EditorAction,
  type EditorDoc,
  type EditorState,
} from '../editor-doc'
import { saveHomeSchema } from '../decoration-save-rules'
import type { DecorationItem } from '../decoration-data'

const rose = (id: string, x: number, y: number, extra: Partial<DecorationItem> = {}): DecorationItem => ({
  id,
  decorationId: 'roses_red',
  name: 'Red Roses',
  type: 'plant',
  zone: 'front_yard',
  position: { x, y, layer: 300000 },
  ...extra,
})

const base: EditorDoc = {
  decorations: [rose('roses_red_1', 64, 240)],
  house: { windowStyle: 'default', wallColor: undefined, houseTitle: undefined },
  atmosphere: { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' },
  template: 'cottage_v1',
  palette: 'thread_sage',
  terrain: { '3,8': 'water' },
}

/** A free placement at exact pixels. */
const at = (x: number, y: number) => ({ position: { x, y }, gridX: null, gridY: null })
/** A placement on grid cell (gx, gy). */
const cell = (gx: number, gy: number) => ({ position: { x: gx * 16, y: gy * 16 }, gridX: gx, gridY: gy })

const run = (...actions: EditorAction[]) => actions.reduce(editorReducer, createEditorState(base))
const then = (state: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, state)
const undo: EditorAction = { type: 'undo' }
const redo: EditorAction = { type: 'redo' }

describe('undo and redo cover the whole home', () => {
  const edits: Array<[string, EditorAction, (doc: EditorDoc) => unknown]> = [
    ['placing a decoration', { type: 'place', decoration: rose('roses_red_2', 96, 240) }, (d) => d.decorations.length],
    ['moving a decoration', { type: 'move', id: 'roses_red_1', placement: at(128, 256) }, (d) => d.decorations[0].position],
    ['removing a decoration', { type: 'remove', ids: ['roses_red_1'] }, (d) => d.decorations.length],
    ['sign text', { type: 'updateDecoration', id: 'roses_red_1', changes: { text: 'HI' } }, (d) => d.decorations[0].text],
    ['a wall colour', { type: 'setHouse', changes: { wallColor: '#3a5f8c' } }, (d) => d.house.wallColor],
    ['a door', { type: 'setHouse', changes: { doorStyle: 'arched' } }, (d) => d.house.doorStyle],
    ['the house title', { type: 'setHouse', changes: { houseTitle: 'Hi' } }, (d) => d.house.houseTitle],
    ['the sky', { type: 'setAtmosphere', changes: { sky: 'night' } }, (d) => d.atmosphere.sky],
    ['the theme', { type: 'setTheme', template: 'cabin_v1', palette: 'crt_glow' }, (d) => [d.template, d.palette]],
    ['a terrain cell', { type: 'paintCell', key: '4,8', tile: 'sand' }, (d) => d.terrain],
    ['an erased terrain cell', { type: 'paintCell', key: '3,8', tile: null }, (d) => d.terrain],
  ]

  test.each(edits)('%s is one step', (_label, action, pick) => {
    const edited = run(action)
    expect(pick(edited.present)).not.toEqual(pick(base))
    expect(canUndo(edited)).toBe(true)
    expect(isDirty(edited)).toBe(true)

    const undone = then(edited, undo)
    expect(undone.present).toBe(base)
    expect(isDirty(undone)).toBe(false)
    expect(canRedo(undone)).toBe(true)

    const redone = then(undone, redo)
    expect(pick(redone.present)).toEqual(pick(edited.present))
    expect(isDirty(redone)).toBe(true)
  })

  test('a new edit clears what redo could bring back', () => {
    const s = run({ type: 'setAtmosphere', changes: { sky: 'night' } }, undo, { type: 'setTheme', template: 'cabin_v1', palette: 'thread_sage' })
    expect(canRedo(s)).toBe(false)
  })

  test('edits that change nothing add no step', () => {
    const s = run(
      { type: 'setAtmosphere', changes: { sky: 'sunny' } },
      { type: 'setTheme', template: 'cottage_v1', palette: 'thread_sage' },
      { type: 'setHouse', changes: { windowStyle: 'default' } },
      { type: 'move', id: 'roses_red_1', placement: at(64, 240) },
      { type: 'move', id: 'not_here', placement: at(0, 0) },
      { type: 'remove', ids: ['not_here'] },
      { type: 'paintCell', key: '3,8', tile: 'water' },
      { type: 'paintCell', key: '9,9', tile: null },
    )
    expect(s.past).toHaveLength(0)
    expect(s.present).toBe(base)
  })

  test('undo with nothing to undo is a no-op', () => {
    const s = run(undo, redo)
    expect(s.present).toBe(base)
  })

  test(`history keeps the last ${HISTORY_LIMIT} steps`, () => {
    let s = createEditorState(base)
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) s = then(s, { type: 'move', id: 'roses_red_1', placement: at(i, 240) })
    expect(s.past).toHaveLength(HISTORY_LIMIT)
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) s = then(s, undo)
    expect(s.present.decorations[0].position).toEqual({ x: 19, y: 240 })
  })
})

describe('strokes and typing are one step', () => {
  const stroke = (...cells: Array<[string, string | null]>): EditorAction[] => [
    { type: 'beginStroke' },
    ...cells.map(([key, tile]): EditorAction => ({ type: 'paintCell', key, tile })),
    { type: 'endStroke' },
  ]

  test('a terrain stroke of many cells undoes in one step', () => {
    const s = run(...stroke(['4,8', 'stone_path'], ['5,8', 'stone_path'], ['6,8', 'stone_path'], ['3,8', null]))
    expect(s.present.terrain).toEqual({ '4,8': 'stone_path', '5,8': 'stone_path', '6,8': 'stone_path' })
    expect(s.past).toHaveLength(1)
    expect(then(s, undo).present.terrain).toEqual(base.terrain)
  })

  test('two strokes are two steps', () => {
    const s = run(...stroke(['4,8', 'sand']), ...stroke(['5,8', 'dirt']))
    expect(then(s, undo).present.terrain).toEqual({ '3,8': 'water', '4,8': 'sand' })
  })

  test('a stroke that painted nothing new adds no step', () => {
    const s = run(...stroke(['3,8', 'water']))
    expect(s.past).toHaveLength(0)
    expect(canUndo(s)).toBe(false)
  })

  test('a stroke that ends where it began adds no step', () => {
    const s = run(...stroke(['4,8', 'sand'], ['4,8', null]))
    expect(s.past).toHaveLength(0)
    expect(isDirty(s)).toBe(false)
  })

  test('undo in the middle of a stroke closes it and undoes all of it', () => {
    const s = run({ type: 'beginStroke' }, { type: 'paintCell', key: '4,8', tile: 'sand' }, { type: 'paintCell', key: '5,8', tile: 'sand' })
    expect(canUndo(s)).toBe(true)
    const undone = then(s, undo, { type: 'paintCell', key: '6,8', tile: 'dirt' })
    expect(undone.strokeBase).toBeNull()
    expect(undone.present.terrain).toEqual({ '3,8': 'water', '6,8': 'dirt' })
    // the late cell is its own step, not part of the closed stroke
    expect(then(undone, undo).present.terrain).toEqual(base.terrain)
  })

  test('typing sign text is one step', () => {
    const typing = ['H', 'HE', 'HEL', 'HELL', 'HELLO'].map(
      (text): EditorAction => ({ type: 'updateDecoration', id: 'roses_red_1', changes: { text }, mergeKey: 'sign' })
    )
    const s = run(...typing)
    expect(s.present.decorations[0].text).toBe('HELLO')
    expect(s.past).toHaveLength(1)
    expect(then(s, undo).present.decorations[0].text).toBeUndefined()
  })

  test('dragging a colour picker is one step, and another edit starts a new one', () => {
    const colour = (wallColor: string): EditorAction => ({ type: 'setHouse', changes: { wallColor }, mergeKey: 'house:wallColor' })
    const s = run(colour('#111111'), colour('#222222'), colour('#333333'), { type: 'setAtmosphere', changes: { sky: 'night' } }, colour('#444444'))
    expect(s.past).toHaveLength(3)
    const once = then(s, undo)
    expect(once.present.house.wallColor).toBe('#333333')
    expect(then(once, undo, undo).present.house.wallColor).toBeUndefined()
  })

  test('undo ends a merge, so typing again after it is a new step', () => {
    const type = (houseTitle: string): EditorAction => ({ type: 'setHouse', changes: { houseTitle }, mergeKey: 'title' })
    const s = run(type('A'), type('AB'), undo, type('C'), type('CD'))
    expect(s.past).toHaveLength(1)
    expect(then(s, undo).present.house.houseTitle).toBeUndefined()
  })
})

describe('unsaved changes', () => {
  test('saving marks the home clean; edits after it are dirty again', () => {
    const edited = run({ type: 'setAtmosphere', changes: { sky: 'night' } })
    const saved = then(edited, { type: 'saved', doc: edited.present })
    expect(isDirty(saved)).toBe(false)
    expect(isDirty(then(saved, { type: 'setTheme', template: 'cabin_v1', palette: 'thread_sage' }))).toBe(true)
    // undo past the save is a change from what's stored
    expect(isDirty(then(saved, undo))).toBe(true)
  })

  test('a save of an older document leaves later edits unsaved', () => {
    const first = run({ type: 'setAtmosphere', changes: { sky: 'night' } })
    const later = then(first, { type: 'setHouse', changes: { wallColor: '#123456' } })
    expect(isDirty(then(later, { type: 'saved', doc: first.present }))).toBe(true)
  })

  test('typing after a save starts a new step, so undo returns to the saved text', () => {
    const type = (houseTitle: string): EditorAction => ({ type: 'setHouse', changes: { houseTitle }, mergeKey: 'title' })
    const s = run(type('A'), type('AB'))
    const after = then(s, { type: 'saved', doc: s.present }, type('ABC'))
    expect(then(after, undo).present.house.houseTitle).toBe('AB')
  })
})

describe('docKey (what counts as a change)', () => {
  const key = (changes: Partial<EditorDoc>) => docKey({ ...base, ...changes })

  test('every part of the home counts', () => {
    const saved = key({})
    expect(key({ terrain: { '3,8': 'water', '4,8': 'sand' } })).not.toBe(saved)
    expect(key({ terrain: {} })).not.toBe(saved)
    expect(key({ house: { ...base.house, wallColor: '#3a5f8c' } })).not.toBe(saved)
    expect(key({ house: { ...base.house, houseTitle: 'Hi' } })).not.toBe(saved)
    expect(key({ atmosphere: { ...base.atmosphere, sky: 'night' } })).not.toBe(saved)
    expect(key({ template: 'cabin_v1' })).not.toBe(saved)
    expect(key({ palette: 'crt_glow' })).not.toBe(saved)
    expect(key({ decorations: [...base.decorations, rose('roses_red_2', 10, 10)] })).not.toBe(saved)
    expect(key({ decorations: [rose('roses_red_1', 80, 240)] })).not.toBe(saved)
    expect(key({ decorations: [rose('roses_red_1', 64, 240, { text: 'HI' })] })).not.toBe(saved)
  })

  test('things that would not change the saved home do not count', () => {
    const saved = key({})
    // key order, and null vs missing vs empty for "not set"
    expect(key({ house: { houseTitle: '', windowStyle: 'default' } })).toBe(saved)
    expect(key({ terrain: { '3,8': 'water' } })).toBe(saved)
    // layer is recomputed on load; sub-pixel positions are rounded on save
    expect(key({ decorations: [rose('roses_red_1', 64.2, 239.8, { position: { x: 64.2, y: 239.8, layer: 1 } })] })).toBe(saved)
    // the instance id is not stored
    expect(key({ decorations: [rose('roses_red_from_db_row', 64, 240)] })).toBe(saved)
  })
})

describe('placing, loading and saving', () => {
  test('a new copy keeps a catalog id that ends in digits', () => {
    const fence = { id: 'fence_2', name: 'Fence', type: 'structure' } as DecorationItem
    const placed = newPlacement(fence, cell(2, 12), '1729300000000_abc123')
    expect(placed).toMatchObject({ id: 'fence_2_1729300000000_abc123', decorationId: 'fence_2', variant: 'default', size: 'medium' })
    // a copy of a copy is still the same catalog item
    expect(newPlacement(placed, cell(0, 12), '9_x').decorationId).toBe('fence_2')
    expect(toSavePayload({ ...base, decorations: [placed] }).decorations[0].decorationId).toBe('fence_2')
  })

  test('custom art keeps its slot', () => {
    const slot = { id: 'custom_asset_3', name: 'My Art 4', type: 'custom', customAssetUrl: 'https://cdn/x.png', slot: 3 } as DecorationItem
    const [saved] = toSavePayload({ ...base, decorations: [newPlacement(slot, cell(0, 12))] }).decorations
    // the slot only: the image comes from the slot when drawn, so a replaced image updates every copy
    expect(saved).toMatchObject({ decorationId: 'custom_asset_3', decorationType: 'custom', data: { slot: 3 } })
  })

  test('sign text is read from data and saved back, and clearing it sticks', () => {
    const [loaded] = docFromProps({ ...base, decorations: [rose('sign_post_r1', 0, 200, { decorationId: 'sign_post', data: { text: 'HI', other: 1 } })] }).decorations
    expect(loaded.text).toBe('HI')
    const doc = { ...base, decorations: [loaded] }
    expect(toSavePayload(doc).decorations[0].data).toEqual({ text: 'HI', other: 1 })
    expect(toSavePayload({ ...doc, decorations: [{ ...loaded, text: 'YO' }] }).decorations[0].data).toEqual({ text: 'YO', other: 1 })
    expect(toSavePayload({ ...doc, decorations: [{ ...loaded, text: '' }] }).decorations[0].data).toEqual({ other: 1 })
  })

  test('cleared house fields are sent as null so the server clears them', () => {
    const payload = toSavePayload({ ...base, house: { wallColor: undefined, houseNumber: '12' } })
    expect(payload.houseCustomizations).toEqual({ wallColor: null, houseNumber: '12' })
  })

  test('a document from older props fills in defaults', () => {
    const doc = docFromProps({ template: 'loft_v1', palette: 'crt_glow' })
    expect(doc).toMatchObject({ decorations: [], terrain: {}, house: { windowStyle: 'default' }, atmosphere: { sky: 'sunny' } })
  })

  test('what the editor sends passes the save schema', () => {
    const s = run(
      { type: 'place', decoration: newPlacement({ id: 'lamp_post_3', name: 'Lamp', type: 'lighting' }, at(100, 200)) },
      { type: 'setHouse', changes: { wallColor: '#3a5f8c', houseTitle: 'Home' } },
    )
    const parsed = saveHomeSchema.safeParse(toSavePayload(s.present))
    expect(parsed.error?.issues).toBeUndefined()
    expect(parsed.data?.decorations[1]).toMatchObject({ decorationId: 'lamp_post_3', positionX: 100, positionY: 200, gridX: null, layerBias: 0 })
  })
})
