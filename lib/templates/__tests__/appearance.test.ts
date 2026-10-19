import {
  THEMES,
  FONT_CHOICES,
  detectTheme,
  knobsBlock,
  readKnobs,
  readThemeVars,
  safeImageUrl,
  stripKnobs,
  writeKnobs,
} from '@/lib/templates/appearance'
import { getDefaultProfileTemplate } from '@/lib/templates/default-profile-templates'
import { sanitizeCss } from '@/lib/utils/sanitization/css'

describe('themes', () => {
  test('each preset reads back its own colours and fonts', () => {
    expect(THEMES.map((t) => t.id)).toHaveLength(5)
    for (const theme of THEMES) {
      expect(theme.vars).toMatchObject({
        ground: expect.stringMatching(/^#|transparent/),
        accent: expect.stringMatching(/^#/),
        fontHead: expect.any(String),
      })
    }
    expect(THEMES.find((t) => t.id === 'charcoal-nights')!.vars.accent).toBe('#e8853d')
  })

  test('a saved preset is recognised, even with the settings block added', () => {
    for (const theme of THEMES) {
      const css = getDefaultProfileTemplate(theme.id)
      expect(detectTheme(css)).toBe(theme.id)
      expect(detectTheme(writeKnobs(css, { accent: '#123456' }))).toBe(theme.id)
    }
    expect(detectTheme('body { color: red }')).toBeNull()
    expect(detectTheme('')).toBeNull()
  })

  test('CSS without the variables has no theme vars', () => {
    expect(readThemeVars('body { color: red }')).toBeNull()
  })
})

describe('the settings block', () => {
  const linen = getDefaultProfileTemplate('classic-linen')

  test('round-trips what it writes', () => {
    const knobs = {
      accent: '#aa3300',
      ground: '#fffaf0',
      groundImage: 'https://example.com/tile.png',
      fontHead: "'Righteous', Verdana, sans-serif",
      fontBody: 'Georgia, serif',
    }
    const css = writeKnobs(linen, knobs)
    expect(readKnobs(css)).toEqual(knobs)
    // The person's own CSS above the block is untouched
    expect(stripKnobs(css).trim()).toBe(linen.trim())
  })

  test('rewrites the block instead of stacking a second one', () => {
    const once = writeKnobs(linen, { accent: '#111111' })
    const twice = writeKnobs(once, { accent: '#222222' })
    expect(twice.match(/Settings > Your page \(rewritten/g)).toHaveLength(1)
    expect(readKnobs(twice).accent).toBe('#222222')
  })

  test('clearing every knob removes the block', () => {
    const css = writeKnobs(writeKnobs(linen, { accent: '#111111' }), {})
    expect(css.trim()).toBe(linen.trim())
  })

  test('carries the @font-face rules for a self-hosted font it picks', () => {
    const block = knobsBlock({ fontHead: "'Righteous', Verdana, sans-serif" })
    expect(block).toContain("font-family: 'Righteous'")
    expect(block).toContain('/fonts/presets/righteous-latin-400-normal.woff2')
    expect(knobsBlock({ fontBody: 'Georgia, serif' })).not.toContain('@font-face')
  })

  test('ignores values that are not a colour, a known font or an https image', () => {
    expect(
      knobsBlock({
        accent: 'red; } body { display: none',
        ground: 'url(x)',
        fontHead: 'Comic Sans; color: red',
        groundImage: 'javascript:alert(1)',
      })
    ).toBe('')
    expect(safeImageUrl('http://example.com/a.png')).toBeNull()
    expect(safeImageUrl('https://example.com/a b.png')).toBeNull()
    expect(safeImageUrl('https://example.com/a").png')).toBeNull()
    expect(safeImageUrl(' https://example.com/tile.png ')).toBe('https://example.com/tile.png')
  })

  test('every font choice is a stack the block accepts', () => {
    for (const font of FONT_CHOICES) expect(knobsBlock({ fontBody: font.stack })).toContain(font.stack)
  })

  test('what it writes comes through the CSS sanitizer unchanged', () => {
    const css = writeKnobs(linen, { accent: '#aa3300', groundImage: 'https://example.com/t.png', fontHead: "'Fraunces', Georgia, serif" })
    expect(sanitizeCss(css).removed).toEqual([])
  })
})
