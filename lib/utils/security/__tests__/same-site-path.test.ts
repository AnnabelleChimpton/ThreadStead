import { sameSitePath } from '../same-site-path'

const ORIGIN = 'https://homepageagain.com'

test('a path on this site comes back as it is', () => {
  expect(sameSitePath('/resident/pat?tab=guestbook#g1', ORIGIN)).toBe('/resident/pat?tab=guestbook#g1')
  expect(sameSitePath('/me', ORIGIN)).toBe('/me')
})

test('anything that would leave the site is refused', () => {
  for (const next of ['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/\r\n/evil.com', 'https://evil.com', 'evil.com', '', 'javascript:alert(1)', '/\\\\evil.com']) {
    expect(sameSitePath(next, ORIGIN)).toBeNull()
  }
})
