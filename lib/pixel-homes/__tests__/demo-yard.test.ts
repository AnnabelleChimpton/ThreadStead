import { DEMO_TERRAIN, DEMO_YARD, demoYardWithArt } from '../demo-yard'
import { DECORATION_DIMENSIONS, getDecorationDimensions } from '../decoration-dimensions'
import { TERRAIN_TILES } from '../decoration-data'
import { decorationDepth, houseDepth, overlapsHouse } from '../depth'

test('every demo item is a real catalog item, inside the yard', () => {
  for (const d of DEMO_YARD) {
    // a known sprite, so it never falls back to the placeholder square
    expect(DECORATION_DIMENSIONS[d.decorationId!]).toBeDefined()
    const { width, height } = getDecorationDimensions(d.decorationId!, d.type)
    expect(d.position!.x).toBeGreaterThanOrEqual(0)
    expect(d.position!.x + width).toBeLessThanOrEqual(512)
    expect(d.position!.y + height).toBeLessThanOrEqual(352)
  }
})

test('nothing is hidden behind the house', () => {
  for (const d of DEMO_YARD) {
    if (overlapsHouse(d)) expect(decorationDepth(d)).toBeGreaterThan(houseDepth())
  }
})

test('the path is a real terrain tile', () => {
  const ids = new Set(TERRAIN_TILES.map((t) => t.id))
  for (const tile of Object.values(DEMO_TERRAIN)) expect(ids.has(tile)).toBe(true)
})

test('catalog art is attached where the catalog has it', () => {
  const yard = demoYardWithArt(new Map([['tree_pine', { pngUrl: 'https://cdn.test/pine.png', renderSvg: null }]]))
  expect(yard.filter((d) => d.pngUrl).map((d) => d.decorationId)).toEqual(['tree_pine', 'tree_pine'])
  expect(yard.find((d) => d.decorationId === 'roses_red')?.pngUrl).toBeUndefined()
})
