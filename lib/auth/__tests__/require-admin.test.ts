/**
 * @jest-environment node
 *
 * requireAdmin(req, res) sends the 401/403 itself, so callers only write
 * `if (!admin) return;`. Without res it keeps the old return-null contract.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/config/database/connection', () => ({
  db: { session: { findFirst: jest.fn() } },
}));

import { requireAdmin } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

const findFirst = (db as any).session.findFirst as jest.Mock;

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

beforeEach(() => findFirst.mockReset());

test('returns the admin and sends nothing', async () => {
  findFirst.mockResolvedValue({ user: { id: 'a', role: 'admin' } });
  const { req, res } = reqRes('retro_session=a.secret');
  expect(await requireAdmin(req, res)).toEqual({ id: 'a', role: 'admin' });
  expect(res.body).toBeUndefined();
});

test('signed out → 401 when given res', async () => {
  const { req, res } = reqRes();
  expect(await requireAdmin(req, res)).toBeNull();
  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ error: 'Authentication required' });
});

test('non-admin → 403 when given res', async () => {
  findFirst.mockResolvedValue({ user: { id: 'm', role: 'member' } });
  const { req, res } = reqRes('retro_session=m.secret');
  expect(await requireAdmin(req, res)).toBeNull();
  expect(res.statusCode).toBe(403);
  expect(res.body).toEqual({ error: 'Admin access required' });
});

test('without res it only returns null (old contract)', async () => {
  findFirst.mockResolvedValue({ user: { id: 'm', role: 'member' } });
  const { req } = reqRes('retro_session=m.secret');
  expect(await requireAdmin(req)).toBeNull();
});
