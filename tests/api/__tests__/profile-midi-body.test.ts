/**
 * @jest-environment node
 *
 * Choosing the page's song: what MidiManager sends goes in, and a body it
 * wouldn't send is a 400. "yes" for autoplay, or an object for the song's
 * id, went to Prisma as a 500.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    media: { findUnique: jest.fn(async () => ({ id: 'm1', userId: 'me', mediaType: 'midi' })) },
    profile: { upsert: jest.fn(async ({ update }: { update: Record<string, unknown> }) => update) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'me', role: 'member' })) }))
jest.mock('@/lib/domain/users/capabilities', () => ({ requireAction: () => async () => ({ sub: 'me' }) }))
jest.mock('@/lib/server/http/csrf', () => ({ ...jest.requireActual('@/lib/server/http/csrf'), csrfProtection: async () => true }))
jest.mock('@/lib/server/http/rate-limit', () => ({ ...jest.requireActual('@/lib/server/http/rate-limit'), rateLimitCheck: async () => true }))

import handler from '@/pages/api/profile/midi'
import { db } from '@/lib/config/database/connection'

async function save(body: unknown) {
  const req = { method: 'POST', query: {}, body, headers: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
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

test("MidiManager's save goes in", async () => {
  const res = await save({ midiId: 'm1', autoplay: true, loop: false, cap: 'c' })
  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ success: true, profileMidiId: 'm1', midiAutoplay: true, midiLoop: false })
})

test('no song: cleared', async () => {
  const res = await save({ midiId: null, autoplay: false, loop: false, cap: 'c' })
  expect(res.statusCode).toBe(200)
  expect(res.body.profileMidiId).toBeNull()
})

test.each([
  [{ midiId: 'm1', autoplay: 'yes', cap: 'c' }, "Autoplay isn't the right kind of value."],
  [{ midiId: { not: 'x' }, cap: 'c' }, "Midi id isn't the right kind of value."],
])('%#: a save MidiManager wouldn\'t send is a 400', async (body, error) => {
  const res = await save(body)
  expect(res.statusCode).toBe(400)
  expect(res.body.error).toBe(error)
  expect(db.profile.upsert).not.toHaveBeenCalled()
})
