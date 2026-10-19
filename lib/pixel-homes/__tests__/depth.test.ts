import {
  HOUSE_SORT_Y,
  OVERLAY_DEPTH,
  decorationDepth,
  houseDepth,
  movesBehindHouse,
  overlapsHouse,
  clampLayerBias,
} from '../depth'
import { getDecorationDimensions } from '../decoration-dimensions'

const item = (id: string, type: string, x: number, y: number, layerBias = 0) => ({ id, decorationId: id, type, position: { x, y }, layerBias })
/** Top-left y that puts an item's feet on `feet`. */
const feetAt = (id: string, type: string, feet: number) => feet - getDecorationDimensions(id, type).height

describe('decorationDepth', () => {
  test('further down the yard is in front; left to right breaks ties', () => {
    const near = item('roses_red', 'plant', 100, 300)
    const far = item('roses_red', 'plant', 100, 200)
    expect(decorationDepth(near)).toBeGreaterThan(decorationDepth(far))
    expect(decorationDepth(item('roses_red', 'plant', 101, 200))).toBeGreaterThan(decorationDepth(far))
  })

  test('paths and water lie under every standing thing, wherever they are', () => {
    const pathAtBottom = item('stone_path', 'path', 0, 340)
    const waterAtBottom = item('pond', 'water', 0, 330)
    const roseAtTop = item('roses_red', 'plant', 0, 0)
    expect(decorationDepth(pathAtBottom)).toBeLessThan(decorationDepth(waterAtBottom))
    expect(decorationDepth(waterAtBottom)).toBeLessThan(decorationDepth(roseAtTop))
  })

  test('a level of bias beats any position at the level below', () => {
    const forwardAtTop = item('roses_red', 'plant', 0, 0, 1)
    const nearest = item('roses_red', 'plant', 500, 351)
    expect(decorationDepth(forwardAtTop)).toBeGreaterThan(decorationDepth(nearest))
    expect(decorationDepth(item('roses_red', 'plant', 500, 351, -1))).toBeLessThan(decorationDepth(item('stone_path', 'path', 0, 0)))
  })

  test('bias is clamped; every depth sits under the overlay and above zero', () => {
    expect(clampLayerBias(99)).toBe(3)
    expect(clampLayerBias(-99)).toBe(-3)
    expect(clampLayerBias('x')).toBe(0)
    expect(decorationDepth(item('roses_red', 'plant', 9999, 9999, 99))).toBeLessThan(OVERLAY_DEPTH)
    expect(decorationDepth(item('stone_path', 'path', -128, -128, -99))).toBeGreaterThan(0)
  })
})

describe('the house in the sort', () => {
  test('feet above its sort line stand behind it, on or below it (against the foundation) in front', () => {
    expect(decorationDepth(item('tree_pine', 'plant', 240, feetAt('tree_pine', 'plant', HOUSE_SORT_Y - 1)))).toBeLessThan(houseDepth())
    expect(decorationDepth(item('roses_red', 'plant', -128, feetAt('roses_red', 'plant', HOUSE_SORT_Y)))).toBeGreaterThan(houseDepth())
    expect(decorationDepth(item('roses_red', 'plant', 240, feetAt('roses_red', 'plant', HOUSE_SORT_Y + 1)))).toBeGreaterThan(houseDepth())
  })

  test('brought forward, anything stands in front of it', () => {
    expect(decorationDepth(item('tree_pine', 'plant', 240, 40, 1))).toBeGreaterThan(houseDepth())
  })

  test('only overlapping, standing, unbiased items behind the sort line count as moving behind it', () => {
    const roofTree = item('tree_pine', 'plant', 240, 60)
    expect(overlapsHouse(roofTree)).toBe(true)
    expect(movesBehindHouse(roofTree)).toBe(true)
    expect(movesBehindHouse({ ...roofTree, layerBias: 1 })).toBe(false)
    expect(movesBehindHouse(item('tree_pine', 'plant', 20, 60))).toBe(false) // beside the house: no overlap
    expect(movesBehindHouse(item('stone_path', 'path', 240, 150))).toBe(false)
    expect(movesBehindHouse(item('roses_red', 'plant', 240, 260))).toBe(false) // in front anyway
  })
})
