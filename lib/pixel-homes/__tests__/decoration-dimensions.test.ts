import { getDecorationDimensions, itemDimensions, sizeScale } from '../decoration-dimensions'
import { catalogArtFields } from '../catalog-art'

describe('decoration sizes (art-direction T5, T6)', () => {
  test('a PNG with a stored size uses it, whatever the table says', () => {
    expect(getDecorationDimensions('roses_red', 'plant', 'medium', { pngUrl: 'x.png', pngWidth: 24, pngHeight: 19 })).toEqual({ width: 24, height: 19 })
    expect(getDecorationDimensions('brand_new', 'plant', 'medium', { pngUrl: 'x.png', pngWidth: 40, pngHeight: 56 })).toEqual({ width: 40, height: 56 })
  })

  test('no PNG, or a PNG from before sizes were stored: the table', () => {
    expect(getDecorationDimensions('roses_red', 'plant', 'medium', { pngWidth: 99, pngHeight: 99 })).toEqual({ width: 24, height: 24 })
    expect(getDecorationDimensions('roses_red', 'plant', 'medium', { pngUrl: 'x.png' })).toEqual({ width: 24, height: 24 })
  })

  test('sizes are whole-number scales only', () => {
    expect([sizeScale('small'), sizeScale('medium'), sizeScale('large'), sizeScale(undefined), sizeScale('huge')]).toEqual([1, 1, 2, 1, 1])
    expect(getDecorationDimensions('roses_red', 'plant', 'large')).toEqual({ width: 48, height: 48 })
    expect(getDecorationDimensions('roses_red', 'plant', 'small')).toEqual({ width: 24, height: 24 })
  })

  test('itemDimensions reads a placed item', () => {
    expect(itemDimensions({ id: 'roses_red_1', decorationId: 'roses_red', type: 'plant', pngUrl: 'x.png', pngWidth: 24, pngHeight: 19 })).toEqual({ width: 24, height: 19 })
  })
})

describe('catalogArtFields', () => {
  test('only the fields that are set', () => {
    expect(catalogArtFields(null)).toEqual({})
    expect(catalogArtFields({ renderSvg: null, pngUrl: null, width: null, height: null, frames: 1 })).toEqual({})
    expect(catalogArtFields({ renderSvg: '<svg/>', pngUrl: null, width: 3, height: 3, frames: 1 })).toEqual({ renderSvg: '<svg/>' })
    expect(catalogArtFields({ renderSvg: null, pngUrl: 'a.png', width: null, height: null, frames: 1 })).toEqual({ pngUrl: 'a.png' })
    expect(catalogArtFields({ renderSvg: null, pngUrl: 'a.png', width: 20, height: 44, frames: 3 })).toEqual({ pngUrl: 'a.png', pngWidth: 20, pngHeight: 44, pngFrames: 3 })
  })
})
