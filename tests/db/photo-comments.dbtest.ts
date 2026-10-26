/**
 * Photo comments, against a real Postgres. A parentId that wasn't text was
 * a 500, and a reply to a reply (or to a hidden comment) was saved where
 * the list, which shows one level of replies, never showed it.
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
// The capability is what PhotoComments mints first; its checks have their own tests
jest.mock('@/lib/domain/users/capabilities', () => ({ requireAction: () => async () => ({ sub: 'x' }) }))

import commentsRoute from '@/pages/api/photos/comments/[photoId]/index'
import { createSession } from '@/lib/auth/server'

const stamp = Date.now()
let cookie: string
let mediaId: string
let topId: string
let replyId: string
let hiddenId: string

async function comment(body: unknown) {
  const req = { method: 'POST', url: '/api/photos/comments/x', query: { photoId: mediaId }, body, headers: { cookie }, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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
  await commentsRoute(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeAll(async () => {
  const owner = await db.user.create({ data: { did: `did:key:photo-owner-${stamp}` } })
  const me = await db.user.create({ data: { did: `did:key:photo-commenter-${stamp}` } })
  mediaId = (await db.media.create({ data: { userId: owner.id, visibility: 'public', thumbnailUrl: 'https://cdn.test/t.png', mediumUrl: 'https://cdn.test/m.png', fullUrl: 'https://cdn.test/f.png' } })).id
  topId = (await db.photoComment.create({ data: { mediaId, authorId: owner.id, content: 'Top' } })).id
  replyId = (await db.photoComment.create({ data: { mediaId, authorId: owner.id, content: 'Reply', parentId: topId } })).id
  hiddenId = (await db.photoComment.create({ data: { mediaId, authorId: owner.id, content: 'Hidden', status: 'hidden' } })).id
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, me.id)
  cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
})

afterAll(async () => {
  await db.user.deleteMany({ where: { did: { in: [`did:key:photo-owner-${stamp}`, `did:key:photo-commenter-${stamp}`] } } })
  await db.$disconnect()
})

test('a reply to a top-level comment goes in, under it', async () => {
  const res = await comment({ content: ' Thanks! ', parentId: topId, cap: 'c' })
  expect(res.statusCode).toBe(201)
  expect(res.body.comment).toMatchObject({ content: 'Thanks!', parentId: topId })
})

test.each([
  ['a reply', () => replyId],
  ['a hidden comment', () => hiddenId],
])("a reply to %s is a 400: it would never show", async (_, parent) => {
  const res = await comment({ content: 'Hi', parentId: parent(), cap: 'c' })
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe("That comment can't take a reply.")
})

test.each([
  [{ content: 'Hi', parentId: { not: 'x' }, cap: 'c' }, "Parent id isn't the right kind of value."],
  [{ content: 'x'.repeat(1001), cap: 'c' }, 'Content is too long: 1000 characters at most.'],
  [{ content: '   ', cap: 'c' }, 'Write something first.'],
])('%#: a comment PhotoComments wouldn\'t send is a 400, not a 500', async (body, error) => {
  const res = await comment(body)
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe(error)
})
