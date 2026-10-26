/**
 * @jest-environment node
 *
 * A comment on a post is text of COMMENT_MAX characters at most, as the
 * form allows. There was no limit, and content or a parentId that wasn't
 * text was a 500 (content.trim threw; an object id went to Prisma).
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: { findUnique: jest.fn(async () => ({ id: 'p1', authorId: 'author' })) },
    comment: { findUnique: jest.fn(), create: jest.fn() },
  },
}))
jest.mock('@/lib/server/http/csrf', () => ({ withCsrfProtection: (h: unknown) => h }))
jest.mock('@/lib/server/http/rate-limit', () => ({ withRateLimit: () => (h: unknown) => h }))
jest.mock('@/lib/domain/users/capabilities', () => ({
  ...jest.requireActual('@/lib/domain/users/capabilities'),
  requireAction: () => async () => ({ sub: 'me' }),
}))

import handler from '@/pages/api/comments/[postId]'
import { db } from '@/lib/config/database/connection'
import { COMMENT_MAX } from '@/lib/domain/posts/comments'

async function post(body: unknown) {
  const req = { method: 'POST', query: { postId: 'p1' }, body, headers: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader() {},
  }
  await handler(req, res as NextApiResponse)
  return res
}

beforeEach(() => jest.clearAllMocks())

test.each([
  [{ content: 'x'.repeat(COMMENT_MAX + 1), cap: 'c' }, `Content is too long: ${COMMENT_MAX} characters at most.`],
  [{ content: { text: 'hi' }, cap: 'c' }, "Content isn't the right kind of value."],
  [{ content: '  ', cap: 'c' }, 'Write something first.'],
  [{ content: 'hi', parentId: { not: 'x' }, cap: 'c' }, "Parent id isn't the right kind of value."],
])('%#: a comment the form wouldn\'t send is a 400 and nothing is written', async (body, error) => {
  const res = await post(body)
  expect(res.statusCode).toBe(400)
  expect(res.body).toEqual({ error })
  expect(db.comment.findUnique).not.toHaveBeenCalled()
  expect(db.comment.create).not.toHaveBeenCalled()
})
