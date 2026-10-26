/**
 * Bookmarks, against a real Postgres. Saving took any collectionId, so a
 * bookmark could be filed into someone else's collection; and a link of any
 * scheme, or a collection field that wasn't text, went in or was a 500.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

jest.mock('@/lib/server/http/csrf', () => ({
  ...jest.requireActual('@/lib/server/http/csrf'),
  csrfProtection: jest.fn(async () => true),
}))
jest.mock('@/lib/server/http/rate-limit', () => ({
  ...jest.requireActual('@/lib/server/http/rate-limit'),
  rateLimitCheck: jest.fn(async () => true),
}))

import saveRoute from '@/pages/api/bookmarks/save'
import collectionsRoute from '@/pages/api/bookmarks/collections'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
let cookie: string
let meId: string
let theirCollectionId: string

async function call(route: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>, method: string, body: unknown) {
  const req = { method, url: '/api/bookmarks', query: {}, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v; return this },
    getHeader(k: string) { return this.headers[k.toLowerCase()] },
    end() { return this },
  }
  await route(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

const site = (over: Record<string, unknown> = {}) => ({ url: `https://example.com/${stamp}`, title: 'A site', sourceType: 'manual', ...over })

beforeAll(async () => {
  meId = (await db.user.create({ data: { did: `did:key:bookmarker-${stamp}` } })).id
  const them = await db.user.create({ data: { did: `did:key:other-${stamp}` } })
  theirCollectionId = (await db.userCollection.create({ data: { userId: them.id, name: 'Theirs' } })).id
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, meId)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.user.deleteMany({ where: { did: { in: [`did:key:bookmarker-${stamp}`, `did:key:other-${stamp}`] } } })
  await db.$disconnect()
})

test("a bookmark can't go into someone else's collection", async () => {
  const res = await call(saveRoute, 'POST', site({ url: `https://example.com/${stamp}/theirs`, collectionId: theirCollectionId }))
  expect(res.statusCode).toBe(404)
  expect(await db.userBookmark.count({ where: { collectionId: theirCollectionId } })).toBe(0)
})

test('a bookmark goes into your own default collection', async () => {
  const res = await call(saveRoute, 'POST', site())
  expect(res.statusCode).toBe(200)
  expect(res.body.bookmark.collectionName).toBe('Saved Sites')
  expect(await db.userBookmark.count({ where: { userId: meId } })).toBe(1)
})

test.each([
  [site({ url: 'javascript:void(0)' }), 'That link needs to start with http:// or https://.'],
  [site({ sourceType: 'anything' }), "Source type isn't one of the choices."],
  [site({ title: { x: 1 } }), "Title isn't the right kind of value."],
])('%#: a bad bookmark is a 400', async (body, error) => {
  const res = await call(saveRoute, 'POST', body)
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe(error)
})

test.each([
  ['POST', { name: 'Reads', visibility: 'everyone' }, "Visibility isn't one of the choices."],
  ['POST', { name: { x: 1 } }, "Name isn't the right kind of value."],
  ['POST', { name: '  ' }, 'Give the collection a name.'],
  ['PUT', { id: { not: 'x' }, name: 'Reads' }, "Id isn't the right kind of value."],
])('%#: a bad collection %s is a 400, not a 500', async (method, body, error) => {
  const res = await call(collectionsRoute, method, body)
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe(error)
})

test('a new collection from the bookmarks page', async () => {
  const res = await call(collectionsRoute, 'POST', { name: 'Reads', visibility: 'private' })
  expect(res.statusCode).toBe(200)
  expect(res.body.collection).toMatchObject({ name: 'Reads', visibility: 'private' })
})
