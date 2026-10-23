/**
 * @jest-environment node
 *
 * middleware.ts end to end with real NextRequests: what a resident's host
 * gets back, and that the main site is untouched.
 */
import { NextRequest } from 'next/server'

const ORIGINAL = { apex: process.env.RESIDENT_SUBDOMAIN_APEX, base: process.env.NEXT_PUBLIC_BASE_URL }
beforeAll(() => {
  process.env.RESIDENT_SUBDOMAIN_APEX = 'homepageagain.com'
  process.env.NEXT_PUBLIC_BASE_URL = 'https://homepageagain.com'
})
afterAll(() => {
  process.env.RESIDENT_SUBDOMAIN_APEX = ORIGINAL.apex
  process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL.base
})

import { middleware } from '@/middleware'

function request(host: string, path: string, method = 'GET', headers: Record<string, string> = {}) {
  return new NextRequest(`https://${host}${path}`, { method, headers: { host, ...headers } })
}

const rewriteOf = (res: Response) => res.headers.get('x-middleware-rewrite')
/** The request headers middleware hands on (Next lists the ones it keeps). */
const keptHeaders = (res: Response) => (res.headers.get('x-middleware-override-headers') ?? '').split(',')
const COOKIE = { cookie: '__Host-retro_session=u1.secret; retro_session=u1.secret' }

test('the atproto path is rewritten to the endpoint, never redirected', () => {
  const res = middleware(request('a-b.homepageagain.com', '/.well-known/atproto-did?x=1'))
  expect(res.status).toBe(200)
  expect(res.headers.get('location')).toBeNull()
  expect(rewriteOf(res)).toBe('https://a-b.homepageagain.com/api/atproto-did/a-b')
})

test('GET / renders their page, signed out, with ?tab= carried through', () => {
  const res = middleware(request('alice.homepageagain.com', '/?tab=guestbook', 'GET', COOKIE))
  expect(rewriteOf(res)).toBe('https://alice.homepageagain.com/site/alice?tab=guestbook')
  expect(keptHeaders(res)).not.toContain('cookie')
  expect(res.headers.get('x-middleware-request-x-resident-label')).toBe('alice')
})

test('static files and public reads are served there without cookies', () => {
  for (const path of ['/_next/static/chunks/main.js', '/api/guestbook/alice', '/api/auth/me']) {
    const res = middleware(request('alice.homepageagain.com', path, 'GET', COOKIE))
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(keptHeaders(res)).not.toContain('cookie')
  }
})

test('any other page goes to the same path on the main site', () => {
  const res = middleware(request('alice.homepageagain.com', '/login?next=%2Fsettings'))
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toBe('https://homepageagain.com/login?next=%2Fsettings')
})

test('other API paths are a JSON 404 there', async () => {
  const res = middleware(request('alice.homepageagain.com', '/api/account/bluesky', 'GET', COOKIE))
  expect(res.status).toBe(404)
  expect(await res.json()).toEqual({ error: 'Not found' })
})

test('DID documents are 404 on a resident host', async () => {
  const res = middleware(request('alice.homepageagain.com', '/.well-known/did.json'))
  expect(res.status).toBe(404)
  expect(rewriteOf(res)).toBeNull()
  expect(middleware(request('alice.homepageagain.com', '/users/abc/did.json')).status).toBe(404)
})

test('nothing but GET and HEAD on a resident host', () => {
  expect(middleware(request('alice.homepageagain.com', '/', 'POST')).status).toBe(405)
  expect(middleware(request('alice.homepageagain.com', '/api/guestbook/alice', 'POST')).status).toBe(405)
  expect(middleware(request('alice.homepageagain.com', '/.well-known/atproto-did', 'DELETE')).status).toBe(405)
  expect(rewriteOf(middleware(request('alice.homepageagain.com', '/.well-known/atproto-did', 'HEAD')))).toContain(
    '/api/atproto-did/alice'
  )
})

test('the main site passes straight through, cookies and all, but never a visitor-sent label', () => {
  const spoofed = middleware(request('homepageagain.com', '/feed', 'GET', { 'x-resident-label': 'alice', ...COOKIE }))
  expect(keptHeaders(spoofed)).not.toContain('x-resident-label')
  expect(keptHeaders(spoofed)).toContain('cookie')

  for (const [host, path] of [
    ['homepageagain.com', '/.well-known/did.json'],
    ['homepageagain.com', '/.well-known/atproto-did'],
    ['www.homepageagain.com', '/'],
  ]) {
    const res = middleware(request(host, path))
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(rewriteOf(res)).toBeNull()
  }
})

test('the label goes to the route as a header too (production builds drop the [label] param)', () => {
  const res = middleware(request('a-b.homepageagain.com', '/', 'GET'))
  expect(res.headers.get('x-middleware-request-x-resident-label')).toBe('a-b')
  // A visitor's own copy of the header is replaced
  const spoofed = new NextRequest('https://alice.homepageagain.com/.well-known/atproto-did', {
    headers: { host: 'alice.homepageagain.com', 'x-resident-label': 'someone-else' },
  })
  expect(middleware(spoofed).headers.get('x-middleware-request-x-resident-label')).toBe('alice')
})
