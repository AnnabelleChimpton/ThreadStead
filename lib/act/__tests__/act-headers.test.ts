/**
 * @jest-environment node
 *
 * The action pages can't be framed by anyone (a resident's CSS could hide
 * one and steer clicks), are cut off from the page that opened them, and
 * aren't kept; the rest of the site keeps its own headers.
 */
import nextConfig from '../../../next.config'

type Rule = { source: string; headers: Array<{ key: string; value: string }> }

test('/act/* : DENY, frame-ancestors none, its own browsing group, no-store; the site keeps self', async () => {
  const rules = (await nextConfig.headers!()) as Rule[]
  const site = rules.find((r) => r.source === '/:path*')!
  const actRule = rules.find((r) => r.source === '/act/:path*')!
  // The later rule wins for the same key, so it must come after the site's
  expect(rules.indexOf(actRule)).toBeGreaterThan(rules.indexOf(site))
  const header = (rule: Rule, key: string) => rule.headers.find((h) => h.key === key)?.value
  expect(header(actRule, 'X-Frame-Options')).toBe('DENY')
  expect(header(actRule, 'Content-Security-Policy')).toContain("frame-ancestors 'none'")
  expect(header(actRule, 'Cross-Origin-Opener-Policy')).toBe('same-origin')
  expect(header(actRule, 'Cache-Control')).toBe('no-store')
  expect(header(site, 'Content-Security-Policy')).toContain("frame-ancestors 'self'")
  // Same policy otherwise
  expect(header(actRule, 'Content-Security-Policy')!.replace("frame-ancestors 'none'", "frame-ancestors 'self'")).toBe(header(site, 'Content-Security-Policy'))
})
