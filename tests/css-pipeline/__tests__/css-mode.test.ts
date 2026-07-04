/**
 * resolveCSSMode is THE single resolver for a profile's CSS mode — the SSR
 * page, ProfileLayout, and ProfileModeRenderer must all agree (they used to
 * implement three divergent versions).
 */
import { resolveCSSMode } from '@/lib/utils/css/css-mode'

describe('resolveCSSMode', () => {
  test('DB field wins when no legacy comment present', () => {
    expect(resolveCSSMode('disable', '.a { color: red; }')).toBe('disable')
    expect(resolveCSSMode('override', undefined)).toBe('override')
  })

  test('legacy CSS_MODE comment overrides the DB field (old rows keep behaving)', () => {
    expect(resolveCSSMode('inherit', '/* CSS_MODE:disable */\n.a { color: red; }')).toBe('disable')
    expect(resolveCSSMode('disable', '/* CSS_MODE:override */')).toBe('override')
  })

  test('invalid values fall through', () => {
    expect(resolveCSSMode('nonsense', '/* CSS_MODE:bogus */')).toBe('inherit')
    expect(resolveCSSMode(null, null)).toBe('inherit')
    expect(resolveCSSMode(undefined, undefined)).toBe('inherit')
  })

  test('comment must match the exact legacy format', () => {
    expect(resolveCSSMode('override', '/* css_mode:disable */')).toBe('override')
    expect(resolveCSSMode('override', 'CSS_MODE:disable')).toBe('override')
  })
})
