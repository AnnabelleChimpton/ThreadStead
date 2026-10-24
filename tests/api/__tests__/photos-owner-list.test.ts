/**
 * @jest-environment node
 *
 * GET /api/photos/[username]?scope=mine: the editor's image picker lists the
 * owner's own pictures, gallery and post/comment images together, private
 * ones too. Only the owner gets that list; without scope=mine the route is
 * the public gallery, unchanged.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async ({ where }: { where: { handle: string } }) =>
        where.handle === 'ghost' ? null : { handle: where.handle, user: { id: `u_${where.handle}` } }
      ),
    },
    media: { findMany: jest.fn(), count: jest.fn() },
  },
}));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/domain/users/profile-access', () => ({
  residentAccess: jest.fn(async () => ({ visible: true })),
  sendPrivateProfile: jest.fn(),
}));

import handler from '@/pages/api/photos/[username]';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { residentAccess } from '@/lib/domain/users/profile-access';

const GALLERY = { id: 'g1', thumbnailUrl: 't1', fullUrl: 'f1', createdAt: new Date('2026-10-02') };
const FROM_POST = { id: 'p1', thumbnailUrl: 't2', fullUrl: 'f2', createdAt: new Date('2026-10-03') };

async function call(query: Record<string, string>, viewer: string | null) {
  (getSessionUser as jest.Mock).mockResolvedValue(viewer ? { id: viewer, role: 'member' } : null);
  const req = { method: 'GET', url: '/api/photos/x', query, headers: {} } as unknown as NextApiRequest;
  const headers: Record<string, string> = {};
  type Reply = { media: Array<{ id: string }>; pagination: Record<string, unknown>; error?: string };
  const res = {
    statusCode: 200,
    body: undefined as Reply | undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload as Reply;
      this.headersSent = true;
      return this;
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
  };
  await handler(req, res as unknown as NextApiResponse);
  return { status: res.statusCode, body: res.body as Reply, headers };
}

beforeEach(() => {
  jest.clearAllMocks();
  (db.media.findMany as jest.Mock).mockResolvedValue([FROM_POST, GALLERY]);
  (db.media.count as jest.Mock).mockResolvedValue(2);
});

describe('scope=mine', () => {
  test('the owner gets gallery, post and page images, any visibility, newest first, paged', async () => {
    const res = await call({ username: 'annie', scope: 'mine', page: '2', limit: '30' }, 'u_annie');

    expect(res.status).toBe(200);
    expect(res.body.media.map((m) => m.id)).toEqual(['p1', 'g1']);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 30, totalCount: 2 });
    expect(res.headers['cache-control']).toBe('private, no-store');

    const where = {
      userId: 'u_annie',
      mediaType: { in: ['image', 'gif'] },
      OR: [{ isGalleryItem: true }, { uploadContext: 'post_embed' }, { uploadContext: 'other' }],
    };
    expect(db.media.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, orderBy: { createdAt: 'desc' }, skip: 30, take: 30 })
    );
    expect(db.media.count).toHaveBeenCalledWith({ where });
    // No visibility filter: private gallery images are the owner's too
    expect((db.media.findMany as jest.Mock).mock.calls[0][0].where).not.toHaveProperty('visibility');
  });

  test('someone else signed in gets a 403 and no list', async () => {
    const res = await call({ username: 'annie', scope: 'mine' }, 'u_stranger');
    expect(res.status).toBe(403);
    expect(db.media.findMany).not.toHaveBeenCalled();
    expect(db.media.count).not.toHaveBeenCalled();
  });

  test('signed out gets a 401 and no list', async () => {
    const res = await call({ username: 'annie', scope: 'mine' }, null);
    expect(res.status).toBe(401);
    expect(db.media.findMany).not.toHaveBeenCalled();
  });

  test('an unknown username is still a 404', async () => {
    const res = await call({ username: 'ghost', scope: 'mine' }, 'u_annie');
    expect(res.status).toBe(404);
    expect(db.media.findMany).not.toHaveBeenCalled();
  });
});

describe('without scope=mine', () => {
  test.each([
    ['the owner', 'u_annie'],
    ['someone else', 'u_stranger'],
    ['signed out', null],
  ])('%s gets the public gallery only, as before', async (_who, viewer) => {
    const res = await call({ username: 'annie' }, viewer);
    expect(res.status).toBe(200);
    expect(residentAccess).toHaveBeenCalled();
    const where = { userId: 'u_annie', mediaType: { in: ['image', 'gif'] }, visibility: 'public', isGalleryItem: true };
    expect(db.media.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(db.media.count).toHaveBeenCalledWith({ where });
    expect(res.headers['cache-control']).toBeUndefined();
  });

  test('a scope other than mine is the public gallery too', async () => {
    await call({ username: 'annie', scope: 'everything' }, 'u_stranger');
    expect((db.media.findMany as jest.Mock).mock.calls[0][0].where).toMatchObject({ visibility: 'public', isGalleryItem: true });
  });
});
