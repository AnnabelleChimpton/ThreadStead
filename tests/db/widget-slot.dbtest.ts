/**
 * /api/user/widget-slot against a real Postgres: a resident saves the slot
 * under their own header only, the fragment is compiled once on save and
 * stored with its compiled form, unsafe markup is stripped, oversized slots
 * are refused, the preview writes nothing, and visitors get the compiled
 * slot without its source. (lib/domain/profile/widget-slot)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))
// The registry imports did-client → @noble/ed25519; nothing here signs.
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))

import slotHandler from '@/pages/api/user/widget-slot'
import previewHandler from '@/pages/api/user/widget-slot/preview'
import profileHandler from '@/pages/api/profile/[username]'
import { getSessionUser } from '@/lib/auth/server'

type Res = { statusCode: number; body: any }

async function call(
  handler: (req: NextApiRequest, res: NextApiResponse) => unknown,
  user: { id: string; primaryHandle?: string } | null,
  method: string,
  body?: unknown,
  query: Record<string, string> = {}
): Promise<Res> {
  ;(getSessionUser as jest.Mock).mockResolvedValue(user)
  const req = { method, body, query, headers: {}, cookies: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
    setHeader: jest.fn(),
  }
  await handler(req, res as NextApiResponse)
  return res as Res
}

async function resident(handle: string) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}`,
      primaryHandle: `${handle}@${SITE_NAME}`,
      handles: { create: { handle, host: SITE_NAME } },
      profile: { create: { displayName: handle } },
    },
  })
  return { id, primaryHandle: `${handle}@${SITE_NAME}` }
}

const slotOf = async (userId: string) =>
  (await db.profile.findUnique({ where: { userId }, select: { widgetSlot: true } }))?.widgetSlot as any

let pat: { id: string; primaryHandle: string }
let sam: { id: string; primaryHandle: string }

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  pat = await resident('pat')
  sam = await resident('sam')
})
afterAll(() => db.$disconnect())

test('signed out, nothing can be read or saved', async () => {
  expect((await call(slotHandler, null, 'GET')).statusCode).toBe(401)
  expect((await call(slotHandler, null, 'POST', { widgets: [{ type: 'rings' }] })).statusCode).toBe(401)
  expect((await call(previewHandler, null, 'POST', { widgets: [{ type: 'rings' }] })).statusCode).toBe(401)
})

test('a save compiles the widgets once and stores them on your own profile only', async () => {
  const res = await call(slotHandler, pat, 'POST', {
    // A userId in the body is ignored: the slot is always the caller's
    userId: sam.id,
    widgets: [
      { type: 'sticky', values: { text: 'hi <b>there</b>', colour: 'blue', tilt: '0' } },
      { type: 'marquee', values: { text: 'welcome' } },
    ],
  })
  expect(res.statusCode).toBe(200)
  expect(res.body.strippedComponents).toEqual([])

  const stored = await slotOf(pat.id)
  expect(stored).toMatchObject({ version: 1, widgets: [{ type: 'sticky' }, { type: 'marquee' }] })
  expect(stored.source).toContain('<StickyNote')
  expect(stored.islands.map((i: any) => i.component)).toEqual(['stickynote'])
  expect(stored.staticHTML).toContain('data-island=')
  expect(stored.staticHTML).toContain('hi &lt;b&gt;there&lt;/b&gt;')
  expect(stored.staticHTML).toContain('<marquee')
  expect(typeof stored.compiledAt).toBe('string')

  expect(await slotOf(sam.id)).toBeNull()

  // The picker reads its forms back
  const read = await call(slotHandler, pat, 'GET')
  expect(read.body.slot.widgets).toEqual(stored.widgets)
  expect(read.body.resident).toMatchObject({ id: pat.id, handle: 'pat', song: null })
  expect(Object.keys(read.body.previews)).toHaveLength(10)
})

test('hand-edited code goes through the same sanitizer', async () => {
  const res = await call(slotHandler, sam, 'POST', {
    source: '<p onclick="steal()">hello</p><script>bad()</script><iframe src="https://e.com"></iframe><StickyNote>ok</StickyNote>',
  })
  expect(res.statusCode).toBe(200)
  const stored = await slotOf(sam.id)
  expect(stored.widgets).toBeNull()
  expect(stored.staticHTML).toContain('hello')
  expect(stored.staticHTML).not.toMatch(/onclick|<script|<iframe|steal|bad\(\)/i)
  expect(stored.islands.map((i: any) => i.component)).toEqual(['stickynote'])
})

test('bad widgets, oversized code and page-only components are refused and change nothing', async () => {
  const before = await slotOf(pat.id)
  const tooLong = await call(slotHandler, pat, 'POST', { source: '<p>x</p>'.repeat(2000) })
  expect(tooLong.statusCode).toBe(413)
  const badLink = await call(slotHandler, pat, 'POST', { widgets: [{ type: 'polaroid', values: { image: 'javascript:alert(1)' } }] })
  expect(badLink.statusCode).toBe(400)
  expect(badLink.body.error).toMatch(/https/)
  const posts = await call(slotHandler, pat, 'POST', { source: '<BlogPosts />' })
  expect(posts.statusCode).toBe(400)
  expect(await slotOf(pat.id)).toEqual(before)
})

test('the preview compiles the same way and writes nothing', async () => {
  const before = await slotOf(pat.id)
  const res = await call(previewHandler, pat, 'POST', { widgets: [{ type: 'secret', values: { button: 'Go', text: 'boo' } }] })
  expect(res.statusCode).toBe(200)
  expect(res.body.compiled.islands.map((i: any) => i.component)).toEqual(['revealbox'])
  expect(res.body.source).toContain('<RevealBox')
  expect(await slotOf(pat.id)).toEqual(before)
})

test('visitors get the compiled slot, never its source', async () => {
  const res = await call(profileHandler, sam, 'GET', undefined, { username: 'pat' })
  expect(res.statusCode).toBe(200)
  expect(res.body.widgetSlot).toMatchObject({ playsSong: false })
  expect(res.body.widgetSlot.staticHTML).toContain('<marquee')
  expect(res.body.widgetSlot).not.toHaveProperty('source')
  expect(res.body.widgetSlot).not.toHaveProperty('widgets')
  expect(res.body.profile).not.toHaveProperty('widgetSlot')
})

test('DELETE empties the slot', async () => {
  expect((await call(slotHandler, pat, 'DELETE')).statusCode).toBe(200)
  expect(await slotOf(pat.id)).toBeNull()
  const res = await call(profileHandler, sam, 'GET', undefined, { username: 'pat' })
  expect(res.body.widgetSlot).toBeNull()
})
