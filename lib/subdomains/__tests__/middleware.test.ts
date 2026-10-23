/**
 * @jest-environment node
 *
 * middleware.ts end to end with real NextRequests: what a resident's host
 * gets back, and that the main site is untouched.
 */
import { NextRequest } from 'next/server'

const ORIGINAL = process.env.RESIDENT_SUBDOMAIN_APEX
beforeAll(() => {
  process.env.RESIDENT_SUBDOMAIN_APEX = 'homepageagain.com'
})
afterAll(() => {
  process.env.RESIDENT_SUBDOMAIN_APEX = ORIGINAL
})

import { middleware } from '@/middleware'

function request(host: string, path: string, method = 'GET') {
  return new NextRequest(`https://${host}${path}`, { method, headers: { host } })
}

const rewriteOf = (res: Response) => res.headers.get('x-middleware-rewrite')

test('the atproto path is rewritten to the endpoint, never redirected', () => {
  const res = middleware(request('a-b.homepageagain.com', '/.well-known/atproto-did?x=1'))
  expect(res.status).toBe(200)
  expect(res.headers.get('location')).toBeNull()
  expect(rewriteOf(res)).toBe('https://a-b.homepageagain.com/api/atproto-did/a-b')
})

test('any other page goes through the redirect route', () => {
  const res = middleware(request('alice.homepageagain.com', '/some/page?q=1'))
  expect(rewriteOf(res)).toBe('https://alice.homepageagain.com/api/subdomain/alice')
})

test('DID documents are 404 on a resident host', async () => {
  const res = middleware(request('alice.homepageagain.com', '/.well-known/did.json'))
  expect(res.status).toBe(404)
  expect(rewriteOf(res)).toBeNull()
  expect(middleware(request('alice.homepageagain.com', '/users/abc/did.json')).status).toBe(404)
})

test('nothing but GET and HEAD on a resident host', () => {
  expect(middleware(request('alice.homepageagain.com', '/', 'POST')).status).toBe(405)
  expect(middleware(request('alice.homepageagain.com', '/.well-known/atproto-did', 'DELETE')).status).toBe(405)
  expect(rewriteOf(middleware(request('alice.homepageagain.com', '/.well-known/atproto-did', 'HEAD')))).toContain(
    '/api/atproto-did/alice'
  )
})

test('the main site passes straight through', () => {
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
