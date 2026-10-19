import { pickPixelScale } from '../EnhancedHouseCanvas'

describe('pickPixelScale', () => {
  it('picks the largest scale that fits and maps to whole device pixels', () => {
    expect(pickPixelScale(1100, 2)).toBe(2) // 1024 fits
    expect(pickPixelScale(1600, 1)).toBe(3)
    expect(pickPixelScale(900, 2)).toBe(1.5) // 768 fits, 1.5 x 2 = 3
    expect(pickPixelScale(900, 1)).toBe(1) // 1.5 x 1 isn't whole
    expect(pickPixelScale(600, 3)).toBe(1)
  })

  it('also fits the height it is given', () => {
    expect(pickPixelScale(1200, 2, 660)).toBe(1.5) // 704 tall is too much
    expect(pickPixelScale(1200, 2, 800)).toBe(2)
  })

  it('stays at 1x when even that is too wide (the scene pans instead)', () => {
    expect(pickPixelScale(343, 3)).toBe(1)
  })
})
