/**
 * Residents' addresses: which requests middleware.ts sends where. The one
 * rule that matters most: /.well-known/atproto-did on a resident's host is
 * never redirected (Bluesky's resolver follows redirects, so the main site
 * answering it would make every address "resolve").
 */
import {
  INFRA_LABELS,
  residentAddress,
  residentApex,
  routeSubdomainRequest,
  subdomainLabelFor,
} from '@/lib/subdomains/host'
import { validateUsername } from '@/lib/domain/validation'

const APEX = 'homepageagain.com'
const route = (host: string, path: string) => routeSubdomainRequest(host, path, APEX)

describe('routeSubdomainRequest', () => {
  test('the main site and www pass through', () => {
    expect(route('homepageagain.com', '/resident/alice')).toEqual({ kind: 'main' })
    expect(route('HomePageAgain.com:443', '/')).toEqual({ kind: 'main' })
    expect(route('www.homepageagain.com', '/.well-known/atproto-did')).toEqual({ kind: 'main' })
    expect(route('example.org', '/.well-known/atproto-did')).toEqual({ kind: 'main' })
    expect(route('', '/')).toEqual({ kind: 'main' })
  })

  test('with no apex (dev on localhost) nothing is a resident host', () => {
    expect(routeSubdomainRequest('alice.localhost:3000', '/.well-known/atproto-did', null)).toEqual({ kind: 'main' })
  })

  test('the atproto path on a resident host goes to the endpoint, any case of host, with a port or trailing dot', () => {
    expect(route('alice.homepageagain.com', '/.well-known/atproto-did')).toEqual({ kind: 'atproto-did', label: 'alice' })
    expect(route('A-B.HomePageAgain.com:443', '/.well-known/atproto-did')).toEqual({ kind: 'atproto-did', label: 'a-b' })
    expect(route('alice.homepageagain.com.', '/.well-known/atproto-did/')).toEqual({ kind: 'atproto-did', label: 'alice' })
  })

  test('DID documents and the API are 404 on resident hosts: federation stays on the main site', () => {
    for (const path of [
      '/.well-known/did.json',
      '/.well-known/did/users/abc/did.json',
      '/users/abc123/did.json',
      '/api/did/abc/document',
      '/api/.well-known/did.json',
      '/api/account/bluesky',
      '/api',
      '/.well-known/anything-else',
    ]) {
      expect(route('alice.homepageagain.com', path)).toEqual({ kind: 'not-found' })
    }
  })

  test('everything else on a resident host goes to their profile', () => {
    for (const path of ['/', '/home', '/resident/alice', '/settings', '/login', '/ring/x/next', '/users/abc']) {
      expect(route('alice.homepageagain.com', path)).toEqual({ kind: 'resident', label: 'alice' })
    }
  })

  test('hosts that are not one label deep are 404', () => {
    expect(route('a.b.homepageagain.com', '/.well-known/atproto-did')).toEqual({ kind: 'not-found' })
    expect(route('-x.homepageagain.com', '/')).toEqual({ kind: 'not-found' })
    expect(route('a_b.homepageagain.com', '/')).toEqual({ kind: 'not-found' })
  })
})

describe('residentApex', () => {
  test('defaults to the base URL host, and none for localhost or an IP', () => {
    expect(residentApex({ NEXT_PUBLIC_BASE_URL: 'https://homepageagain.com' })).toBe('homepageagain.com')
    expect(residentApex({ NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' })).toBeNull()
    expect(residentApex({ NEXT_PUBLIC_BASE_URL: 'http://127.0.0.1:3000' })).toBeNull()
    expect(residentApex({})).toBeNull()
  })

  test('RESIDENT_SUBDOMAIN_APEX overrides it', () => {
    expect(
      residentApex({ RESIDENT_SUBDOMAIN_APEX: 'HomePageAgain.localhost', NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' })
    ).toBe('homepageagain.localhost')
  })
})

describe('labels', () => {
  test('underscores become hyphens', () => {
    expect(subdomainLabelFor('a_b')).toBe('a-b')
    expect(subdomainLabelFor('Alice')).toBe('alice')
    expect(residentAddress('a-b', APEX)).toBe('a-b.homepageagain.com')
    expect(residentAddress(null, APEX)).toBeNull()
    expect(residentAddress('a-b', null)).toBeNull()
  })

  test('every valid username makes a valid label', () => {
    for (const name of ['abc', 'a_b', 'a-b-c', 'x_1_y', 'z'.repeat(32)]) {
      expect(validateUsername(name).ok).toBe(true)
      expect(route(`${subdomainLabelFor(name)}.${APEX}`, '/')).toEqual({ kind: 'resident', label: subdomainLabelFor(name) })
    }
  })

  test('new signups can take none of the infra labels', () => {
    for (const label of INFRA_LABELS) {
      expect({ label, ok: validateUsername(label).ok }).toEqual({ label, ok: false })
    }
  })

  test('the reserved words the scope lists, cdn first', () => {
    for (const name of ['cdn', 'staging', 'postmaster', 'noreply', 'autodiscover', 'neighborhood', 'bsky', 'shop', 'accounts']) {
      expect(validateUsername(name)).toMatchObject({ ok: false, code: 'reserved' })
    }
  })
})
