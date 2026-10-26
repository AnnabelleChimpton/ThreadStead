import { DEFAULT_POLICIES, policyTexts } from '../policies'

test('saved texts win; a missing or empty one is the default', () => {
  expect(policyTexts([
    { key: 'terms_simple', value: 'Be kind.' },
    { key: 'privacy_full', value: '' },
    { key: 'site_name', value: 'not a policy' },
  ])).toEqual({ ...DEFAULT_POLICIES, terms_simple: 'Be kind.' })
})
