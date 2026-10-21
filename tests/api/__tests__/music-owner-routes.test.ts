/**
 * @jest-environment node
 *
 * The owner's side of music (MIDI plan Phase 5): deleting the song on your
 * profile clears it from the profile.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/config/database/connection', () => {
  const db = {
    handle: { findFirst: jest.fn() },
    media: { findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn((args: unknown) => ({ op: 'media.delete', args })) },
    profile: { updateMany: jest.fn((args: unknown) => ({ op: 'profile.updateMany', args })) },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };
  return { db };
});
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/domain/users/capabilities', () => ({
  requireAction: jest.fn(() => async (token: string) => {
    if (token !== 'good-cap') throw new Error('cap: bad');
    return { sub: 'owner' };
  }),
}));
jest.mock('@/lib/storage/r2', () => ({
  keyFromPublicUrl: (url: string) => url.replace('https://cdn.example.com/', ''),
  deleteObjects: jest.fn(async (keys: string[]) => ({ deleted: keys, failed: [] })),
}));

import mediaHandler from '@/pages/api/media/[id]';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { deleteObjects } from '@/lib/storage/r2';

const CSRF = 'csrf-tok';
function call(handler: typeof mediaHandler, method: string, query: Record<string, string>, body?: unknown) {
  const req = {
    method,
    query,
    body,
    url: '/api/test',
    headers: { cookie: `csrf_token=${CSRF}`, 'x-csrf-token': CSRF, 'content-type': 'application/json' },
  } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; this.headersSent = true; return this; },
    setHeader: jest.fn(),
  };
  return Promise.resolve(handler(req, res as unknown as NextApiResponse)).then(() => res);
}

let seq = 0;
beforeEach(() => {
  jest.clearAllMocks();
  // A fresh owner id per test keeps the route's limiter out of it
  (getSessionUser as jest.Mock).mockResolvedValue({ id: `owner-${++seq}` });
});

test('deleting the song on your profile takes it off the profile too, and deletes each file once', async () => {
  const owner = `owner-${seq}`;
  (db.media.findUnique as jest.Mock).mockResolvedValue({
    id: 's1', userId: owner, mediaType: 'midi',
    fullUrl: 'https://cdn.example.com/media/s1.mid',
    thumbnailUrl: 'https://cdn.example.com/media/s1.mid',
    mediumUrl: 'https://cdn.example.com/media/s1.mid',
    soundBankUrl: 'https://cdn.example.com/media/s1.sf2',
  });
  const res = await call(mediaHandler, 'DELETE', { id: 's1' }, { cap: 'good-cap' });
  expect(res.statusCode).toBe(200);
  expect(deleteObjects).toHaveBeenCalledWith(['media/s1.mid', 'media/s1.sf2'], expect.anything());
  expect(db.profile.updateMany).toHaveBeenCalledWith({ where: { userId: owner, profileMidiId: 's1' }, data: { profileMidiId: null } });
  expect(db.$transaction).toHaveBeenCalled();
});
