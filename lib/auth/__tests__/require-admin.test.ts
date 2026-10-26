/**
 * @jest-environment node
 *
 * requireAdmin(req, res) sends the 401/403 itself, so callers only write
 * `if (!admin) return;`. Without res it keeps the old return-null contract.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/config/database/connection', () => ({
  db: { session: { findUnique: jest.fn() } },
}));

import { requireAdmin } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

const findUnique = (db as any).session.findUnique as jest.Mock;

function reqRes(cookie?: string) {
  const req = { headers: cookie ? { cookie } : {} } as unknown as NextApiRequest;
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return { req, res: res as NextApiResponse & { statusCode: number; body: any } };
}

const session = (userId: string, user: object) => ({
  userId,
  expiresAt: new Date(Date.now() + 60_000),
  user,
});

beforeEach(() => findUnique.mockReset());

test('returns the admin and sends nothing', async () => {
  findUnique.mockResolvedValue(session('a', { id: 'a', role: 'admin' }));
  const { req, res } = reqRes('retro_session=a.secret');
  expect(await requireAdmin(req, res)).toEqual({ id: 'a', role: 'admin' });
  expect(res.body).toBeUndefined();
});

test('signed out → 401 when given res', async () => {
  const { req, res } = reqRes();
  expect(await requireAdmin(req, res)).toBeNull();
  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ error: 'Sign in first.' });
});

test('non-admin → 403 when given res', async () => {
  findUnique.mockResolvedValue(session('m', { id: 'm', role: 'member' }));
  const { req, res } = reqRes('retro_session=m.secret');
  expect(await requireAdmin(req, res)).toBeNull();
  expect(res.statusCode).toBe(403);
  expect(res.body).toEqual({ error: 'Admin access required' });
});

test('without res it only returns null (old contract)', async () => {
  findUnique.mockResolvedValue(session('m', { id: 'm', role: 'member' }));
  const { req } = reqRes('retro_session=m.secret');
  expect(await requireAdmin(req)).toBeNull();
});
