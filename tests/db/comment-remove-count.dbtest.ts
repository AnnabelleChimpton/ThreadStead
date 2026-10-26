/**
 * Removing a comment, against a real Postgres: the post's comment count
 * goes down once. Removing it again (a double click, a retry) took one off
 * each time, so the count drifted below the real number.
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

import removeRoute from '@/pages/api/comments/remove'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
let cookie: string
let postId: string
let commentId: string

async function remove(body: unknown) {
  const req = { method: 'POST', url: '/api/comments/remove', query: {}, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await removeRoute(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

const count = async () => (await db.postMetrics.findUnique({ where: { postId } }))?.commentCount

beforeAll(async () => {
  const me = await db.user.create({ data: { did: `did:key:comment-remover-${stamp}` } })
  postId = (await db.post.create({ data: { authorId: me.id, bodyText: 'x', visibility: 'public' } })).id
  commentId = (await db.comment.create({ data: { postId, authorId: me.id, content: 'one' } })).id
  await db.comment.create({ data: { postId, authorId: me.id, content: 'two' } })
  await db.postMetrics.create({ data: { postId, commentCount: 2, viewCount: 0, uniqueViewCount: 0 } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, me.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.user.deleteMany({ where: { did: `did:key:comment-remover-${stamp}` } })
  await db.$disconnect()
})

test('removing a comment twice takes one off the count', async () => {
  expect((await remove({ commentId })).statusCode).toBe(200)
  expect((await remove({ commentId })).statusCode).toBe(200)
  expect(await count()).toBe(1)
})

test("an id that isn't text is a 400, not a 500", async () => {
  expect((await remove({ commentId: { not: 'x' } })).statusCode).toBe(400)
})
