import { buildExcerpt, decodeEntities, toPlainText } from '../excerpt'
import { escapeLike, parseIntParam } from '../query'
import { ApiError } from '@/lib/api/errors'

describe('escapeLike', () => {
  test('escapes %, _ and backslash', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b')
    expect(escapeLike('plain')).toBe('plain')
  })
})

describe('parseIntParam', () => {
  const opts = { fallback: 20, min: 1, max: 50 }
  test('missing → fallback; valid → number; too big → clamped', () => {
    expect(parseIntParam(undefined, 'limit', opts)).toBe(20)
    expect(parseIntParam('', 'limit', opts)).toBe(20)
    expect(parseIntParam('7', 'limit', opts)).toBe(7)
    expect(parseIntParam(['9', '3'], 'limit', opts)).toBe(9)
    expect(parseIntParam('900', 'limit', opts)).toBe(50)
  })
  test.each(['abc', '-1', '0', '2.5', '1e3', ' '])('%j → ApiError 400', (raw) => {
    expect(() => parseIntParam(raw, 'limit', opts)).toThrow(ApiError)
  })
})

describe('excerpts', () => {
  test('decodes named and numeric entities, drops unknown ones', () => {
    expect(decodeEntities('a&nbsp;b &amp; c &#39;d&#x27; &bogus; &#7;')).toBe("a b & c 'd'  ")
  })

  test('strips tags, markdown images and image remnants, keeps link text and snake_case', () => {
    expect(toPlainText('<p>Hi <b>there</b></p><script>x()</script>')).toBe('Hi there')
    expect(toPlainText('Look ![a cat](https://x/cat.png) at [my site](https://x) !IMG_0980.png ok')).toBe(
      'Look at my site ok'
    )
    expect(toPlainText('**bold** and *it* and my_var_name')).toBe('bold and it and my_var_name')
  })

  test('centres the excerpt on the match', () => {
    const text = 'x '.repeat(200) + 'needle' + ' y'.repeat(200)
    const excerpt = buildExcerpt(text, 'NEEDLE')!
    expect(excerpt).toContain('needle')
    expect(excerpt.startsWith('…')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThan(170)
  })

  test('empty after cleaning → undefined', () => {
    expect(buildExcerpt('<img src="a.png">', 'q')).toBeUndefined()
  })
})
