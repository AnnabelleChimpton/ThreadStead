import { customArtUrl, customSlotOf, customSlotUrls } from '../custom-art'

test('a placed copy points at its slot through its id', () => {
  expect(customSlotOf('custom_asset_0')).toBe(0)
  expect(customSlotOf('custom_asset_4')).toBe(4)
  expect(customSlotOf('custom_asset_5')).toBeNull()
  expect(customSlotOf('roses_red')).toBeNull()
})

test('slot URLs come from the stored list, ignoring junk', () => {
  expect(customSlotUrls([{ slot: 1, url: 'a' }, { slot: 3, url: 'b' }, { slot: 9, url: 'c' }, { slot: 2 }, null, 'x'])).toEqual([null, 'a', null, 'b', null])
  expect(customSlotUrls(null)).toEqual([null, null, null, null, null])
})

test('a copy shows its slot’s current image, or nothing for an empty slot', () => {
  const urls = customSlotUrls([{ slot: 1, url: 'new.png' }])
  expect(customArtUrl('custom_asset_1', urls)).toBe('new.png')
  expect(customArtUrl('custom_asset_2', urls)).toBeNull()
  expect(customArtUrl('tree_pine', urls)).toBeNull()
})
