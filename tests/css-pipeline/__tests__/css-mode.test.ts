/**
 * resolveCSSMode is THE single resolver for a profile's CSS mode — the SSR
 * page, ProfileLayout, and ProfileModeRenderer must all agree (they used to
 * implement three divergent versions).
 */
import { resolveCSSMode } from '@/lib/utils/css/css-mode'

describe('resolveCSSMode', () => {
  test('the DB field decides', () => {
    expect(resolveCSSMode('disable')).toBe('disable')
    expect(resolveCSSMode('override')).toBe('override')
    expect(resolveCSSMode('inherit')).toBe('inherit')
  })

  test('invalid or missing values fall through to inherit', () => {
    expect(resolveCSSMode('nonsense')).toBe('inherit')
    expect(resolveCSSMode(null)).toBe('inherit')
    expect(resolveCSSMode(undefined)).toBe('inherit')
  })
})
