import { editorSnapshot, type EditorDocument } from '../editor-snapshot'
import type { DecorationItem } from '../decoration-data'

const rose = (id: string, x: number, y: number, extra: Partial<DecorationItem> = {}): DecorationItem => ({
  id,
  name: 'Red Roses',
  type: 'plant',
  position: { x, y, layer: 300000 },
  ...extra,
})

const base: EditorDocument = {
  decorations: [rose('roses_red_1', 64, 240, { decorationId: 'roses_red' })],
  houseCustomizations: { windowStyle: 'default', wallColor: null, houseTitle: null },
  atmosphere: { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' },
  template: 'cottage_v1',
  palette: 'thread_sage',
  terrain: { '3,8': 'water' },
}
const snap = (changes: Partial<EditorDocument>) => editorSnapshot({ ...base, ...changes })

describe('editorSnapshot (the dirty flag)', () => {
  test('every part of the home counts as a change, not just decorations', () => {
    const saved = snap({})
    expect(snap({ terrain: { '3,8': 'water', '4,8': 'sand' } })).not.toBe(saved)
    expect(snap({ terrain: {} })).not.toBe(saved)
    expect(snap({ houseCustomizations: { ...base.houseCustomizations, wallColor: '#3a5f8c' } })).not.toBe(saved)
    expect(snap({ houseCustomizations: { ...base.houseCustomizations, houseTitle: 'Hi' } })).not.toBe(saved)
    expect(snap({ atmosphere: { ...base.atmosphere, sky: 'night' } })).not.toBe(saved)
    expect(snap({ template: 'cabin_v1' })).not.toBe(saved)
    expect(snap({ palette: 'crt_glow' })).not.toBe(saved)
    expect(snap({ decorations: [...base.decorations, rose('roses_red_2', 10, 10)] })).not.toBe(saved)
    expect(snap({ decorations: [rose('roses_red_1', 80, 240, { decorationId: 'roses_red' })] })).not.toBe(saved)
    expect(snap({ decorations: [rose('roses_red_1', 64, 240, { decorationId: 'roses_red', text: 'HI' })] })).not.toBe(saved)
  })

  test('things that would not change the saved home do not count', () => {
    const saved = snap({})
    // key order, and null vs missing vs empty for "not set"
    expect(snap({ houseCustomizations: { houseTitle: '', windowStyle: 'default' } })).toBe(saved)
    expect(snap({ terrain: { '3,8': 'water' } })).toBe(saved)
    // layer is recomputed on load; sub-pixel positions are rounded on save
    expect(snap({ decorations: [rose('roses_red_1', 64.2, 239.8, { decorationId: 'roses_red', position: { x: 64.2, y: 239.8, layer: 1 } })] })).toBe(saved)
  })

  test('undoing back to the saved state is clean again', () => {
    const saved = snap({})
    const edited = snap({ decorations: [] })
    expect(edited).not.toBe(saved)
    expect(snap({ decorations: base.decorations })).toBe(saved)
  })
})
