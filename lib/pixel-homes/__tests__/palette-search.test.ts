import { matchesSearch } from '../palette-search'

const lantern = { id: 'lantern_post', name: 'Lantern Post', type: 'lighting' }
const roses = { id: 'roses_red', name: 'Red Roses', type: 'plant' }

test('names and ids, as before', () => {
  expect(matchesSearch(roses, 'plants', 'red')).toBe(true)
  expect(matchesSearch(roses, 'plants', 'roses_red')).toBe(true)
  expect(matchesSearch(roses, 'plants', 'blue')).toBe(false)
})

test('everyday words for a category find what is in it', () => {
  expect(matchesSearch(lantern, 'lighting', 'lamp')).toBe(true)
  expect(matchesSearch(lantern, 'lighting', 'lamps')).toBe(true)
  expect(matchesSearch(roses, 'plants', 'flower')).toBe(true)
  expect(matchesSearch(roses, 'lighting', 'flower')).toBe(false)
})

test('every word has to match', () => {
  expect(matchesSearch(roses, 'plants', 'red flower')).toBe(true)
  expect(matchesSearch(roses, 'plants', 'red lamp')).toBe(false)
  expect(matchesSearch(roses, 'plants', '   ')).toBe(true)
})
