/**
 * Inline styles with an old browser's fallback after a value that works keep
 * the one a browser would (bug bash 2026-10-26).
 */
import { parseStyleString } from '../parse-style-string'

test("an old browser's spelling after a working value doesn't replace it", () => {
  expect(parseStyleString('background: #c0392b; background: -moz-linear-gradient(top, red, blue)').background).toBe('#c0392b')
  expect(parseStyleString('width: 260px; width: -moz-fit-content').width).toBe('260px')
  expect(parseStyleString('background: -webkit-gradient(linear, 0 0, 0 1, from(red)); background: linear-gradient(red, blue)').background).toBe('linear-gradient(red, blue)')
})

test('a later working value still wins, as in a browser', () => {
  expect(parseStyleString('color: red; color: blue').color).toBe('blue')
  expect(parseStyleString('background: -moz-linear-gradient(red, blue)').background).toBe('-moz-linear-gradient(red, blue)')
})

test("old Internet Explorer's *property and _property hacks are skipped", () => {
  expect(parseStyleString('*display: inline; _height: 1px; display: block')).toEqual({ display: 'block' })
})
