import { HOUSE_LAYER_SETS, HOUSE_SOCKETS, houseOptionSprites } from '../house-layers'
import { HOUSE_OPTION_ITEMS, houseOptionCrop } from '../house-option-items'

describe('decorator house items', () => {
  test('every door, window, window decor, trim and chimney item draws on every house', () => {
    for (const [template, set] of Object.entries(HOUSE_LAYER_SETS)) {
      for (const [itemId, { set: choice }] of Object.entries(HOUSE_OPTION_ITEMS)) {
        const value = Object.values(choice)[0]
        if (value === 'default' || value === 'none') continue
        const names = houseOptionSprites(template, set, choice as Record<string, unknown>).map((s) => s.name)
        const drawn = names.some((n) => n.endsWith(`-${value}`)) || (set.sameAsDefault ?? []).some((n) => n.endsWith(`-${value}`))
        expect([template, itemId, drawn]).toEqual([template, itemId, true])
      }
    }
  })

  test('each close-up crop is a square on the house canvas', () => {
    for (const template of Object.keys(HOUSE_SOCKETS)) {
      for (const part of ['door', 'window', 'treatment', 'trim', 'chimney'] as const) {
        const crop = houseOptionCrop(template, part)
        expect(crop.size).toBeGreaterThan(10)
        expect(crop.x).toBeGreaterThanOrEqual(0)
        expect(crop.y).toBeGreaterThanOrEqual(0)
        expect(crop.x + crop.size).toBeLessThanOrEqual(200)
        expect(crop.y + crop.size).toBeLessThanOrEqual(180)
      }
    }
  })
})
