/**
 * A colour with transparency shows its colour in the picker, not black
 * (bug bash 2026-10-26): the canvas reads it back as rgba().
 */
import { colorInputValue } from '../color-input'

test('rgba() from the canvas becomes #rrggbb, alpha left off', () => {
  // jsdom has no canvas: one that reads colours back the way a browser does
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    let fill = '#000000'
    return {
      get fillStyle() {
        return fill
      },
      set fillStyle(value: string) {
        fill = value === 'rgb(255 240 200 / 90%)' ? 'rgba(255, 240, 200, 0.9)' : value
      },
    } as unknown as CanvasRenderingContext2D
  })
  expect(colorInputValue('rgb(255 240 200 / 90%)')).toBe('#fff0c8')
  expect(colorInputValue('#11223380')).toBe('#112233')
})
