/**
 * @jest-environment node
 *
 * The owner's side of music (MIDI plan Phase 5): the song list is yours
 * alone, and deleting the song on your profile clears it from the profile.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/config/database/connection', () => {
  const db = {
    handle: { findFirst: jest.fn() },
    media: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn((args: unknown) => ({ op: 'media.delete', args })),
      update: jest.fn((args: unknown) => ({ op: 'media.update', args })),
    },
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

import songsHandler from '@/pages/api/media/midi/[username]';
import mediaHandler from '@/pages/api/media/[id]';
import orderHandler from '@/pages/api/user/song-order';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { deleteObjects } from '@/lib/storage/r2';

const CSRF = 'csrf-tok';
function call(handler: typeof songsHandler, method: string, query: Record<string, string>, body?: unknown) {
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

test('your songs, every one, without raw storage links', async () => {
  (db.handle.findFirst as jest.Mock).mockResolvedValue({ userId: `owner-${seq}` });
  (db.media.findMany as jest.Mock).mockResolvedValue([{ id: 's1', title: 'Little tune', caption: null }]);
  const res = await call(songsHandler, 'GET', { username: 'me' });
  expect(res.statusCode).toBe(200);
  const query = (db.media.findMany as jest.Mock).mock.calls[0][0];
  expect(query.where).toEqual({ userId: `owner-${seq}`, mediaType: 'midi' });
  // Your order once you've moved one; songs added since come first
  expect(query.orderBy).toEqual([{ songOrder: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }]);
  expect((db.media.findMany as jest.Mock).mock.calls[0][0].select.fullUrl).toBeUndefined();
});

test('someone else’s song list is refused', async () => {
  (db.handle.findFirst as jest.Mock).mockResolvedValue({ userId: 'somebody-else' });
  const res = await call(songsHandler, 'GET', { username: 'them' });
  expect(res.statusCode).toBe(403);
  expect(db.media.findMany).not.toHaveBeenCalled();
});

test('signed out, there is no song list', async () => {
  (getSessionUser as jest.Mock).mockResolvedValue(null);
  const res = await call(songsHandler, 'GET', { username: 'me' });
  expect(res.statusCode).toBe(401);
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

describe('the order of your songs', () => {
  const mine = () => (db.media.findMany as jest.Mock).mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

  test('saves the whole list, top first, in one go', async () => {
    mine();
    const res = await call(orderHandler, 'POST', {}, { ids: ['c', 'a', 'b'] });
    expect(res.statusCode).toBe(200);
    expect((db.media.findMany as jest.Mock).mock.calls[0][0].where).toEqual({ userId: `owner-${seq}`, mediaType: 'midi' });
    expect(db.media.update).toHaveBeenNthCalledWith(1, { where: { id: 'c' }, data: { songOrder: 0 } });
    expect(db.media.update).toHaveBeenNthCalledWith(3, { where: { id: 'b' }, data: { songOrder: 2 } });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['someone else’s song in it', ['a', 'b', 'not-mine']],
    ['a song left out', ['a', 'b']],
    ['a song twice', ['a', 'b', 'b']],
  ])('refuses a list with %s', async (_label, ids) => {
    mine();
    const res = await call(orderHandler, 'POST', {}, { ids });
    expect(res.statusCode).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
