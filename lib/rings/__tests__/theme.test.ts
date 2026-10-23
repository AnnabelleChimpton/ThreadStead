/**
 * A ring's theme colour goes into its page's stylesheet, so only a colour
 * gets through. The settings form used to save ids like "thread-pine", which
 * the page wrote in as a CSS colour and broke.
 */
import { RING_THEMES, ringThemeHex } from '@/lib/rings/theme'

it('takes #rgb and #rrggbb colours', () => {
  expect(ringThemeHex('#2E4B3F')).toBe('#2e4b3f')
  expect(ringThemeHex(' #abc ')).toBe('#abc')
})

it('reads the ids the form used to save', () => {
  expect(ringThemeHex('thread-pine')).toBe(RING_THEMES[0].hex)
  expect(ringThemeHex('thread-berry')).toBe('#8c4a5b')
})

it('refuses anything else, so no CSS gets into the page', () => {
  for (const value of ['red} nav{display:none', 'url(//tracker.example)', 'red', '#12345', '', null, undefined]) {
    expect(ringThemeHex(value)).toBeNull()
  }
})
