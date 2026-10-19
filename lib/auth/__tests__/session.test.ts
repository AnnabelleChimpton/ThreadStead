/**
 * @jest-environment node
 *
 * Session helpers (TECH_DEBT_AUDIT §2.4). The cookie name, flags and 7-day
 * TTL are what verify.ts / email-verify.ts / logout.ts set before they shared
 * these helpers — existing browser sessions depend on them not changing.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    session: { create: jest.fn(), findUnique: jest.fn(), deleteMany: jest.fn() },
    // createSession's moderation check (lib/domain/users/moderation.ts)
    user: { findUnique: jest.fn().mockResolvedValue({ moderationStatus: 'active', suspendedUntil: null }) },
  },
}));

import {
  SESSION_TTL_SECONDS,
  clearSession,
  createSession,
  endAllSessions,
  endOtherSessions,
  getSessionUser,
  readCookie,
} from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

const create = (db as any).session.create as jest.Mock;
const findUnique = (db as any).session.findUnique as jest.Mock;
const deleteMany = (db as any).session.deleteMany as jest.Mock;

function req(cookie?: string) {
  return { headers: cookie === undefined ? {} : { cookie } } as unknown as NextApiRequest;
}

function res() {
  const headers: Record<string, unknown> = {};
  return {
    headers,
    setHeader(name: string, value: unknown) {
      headers[name.toLowerCase()] = value;
      return this;
    },
  } as unknown as NextApiResponse & { headers: Record<string, unknown> };
}

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  create.mockReset().mockResolvedValue({});
  findUnique.mockReset();
  deleteMany.mockReset().mockResolvedValue({ count: 0 });
});
afterEach(() => setNodeEnv(ORIGINAL_NODE_ENV));

describe('createSession', () => {
  test('stores a 7-day session and sets the session + CSRF cookies', async () => {
    setNodeEnv('development');
    const r = res();
    const before = Date.now();
    await createSession(r, 'user-1');

    expect(SESSION_TTL_SECONDS).toBe(604800);
    const { userId, secret, expiresAt } = create.mock.calls[0][0].data;
    expect(userId).toBe('user-1');
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    const ttl = (expiresAt as Date).getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(604800 * 1000 - 50);
    expect(ttl).toBeLessThanOrEqual(604800 * 1000 + 1000);

    const [session, csrf] = r.headers['set-cookie'] as string[];
    expect(session).toBe(
      `retro_session=user-1.${secret}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`
    );
    expect(csrf).toMatch(/^csrf_token=[0-9a-f]{64}; Path=\/; Max-Age=604800; SameSite=Lax$/);
  });

  test('adds Secure in production', async () => {
    setNodeEnv('production');
    const r = res();
    await createSession(r, 'user-1');
    const [session, csrf] = r.headers['set-cookie'] as string[];
    expect(session).toMatch(/; HttpOnly; Secure; Path=\/; Max-Age=604800; SameSite=Strict$/);
    expect(csrf).toContain('Secure; ');
  });

  test('a new secret every time', async () => {
    await createSession(res(), 'u');
    await createSession(res(), 'u');
    expect(create.mock.calls[0][0].data.secret).not.toBe(create.mock.calls[1][0].data.secret);
  });

  test('refuses a banned or suspended account: no row, no cookie', async () => {
    const userFind = (db as any).user.findUnique as jest.Mock;
    userFind.mockResolvedValueOnce({ moderationStatus: 'banned', suspendedUntil: null });
    const r = res();
    await expect(createSession(r, 'u')).rejects.toMatchObject({ status: 403, message: 'This account is banned.' });
    expect(create).not.toHaveBeenCalled();
    expect(r.headers['set-cookie']).toBeUndefined();

    userFind.mockResolvedValueOnce({ moderationStatus: 'suspended', suspendedUntil: new Date('2099-11-03T00:00:00Z') });
    await expect(createSession(res(), 'u')).rejects.toMatchObject({
      message: 'This account is suspended until 3 November 2099.',
    });
  });
});

describe('endAllSessions', () => {
  test("deletes every one of the user's sessions", async () => {
    await endAllSessions('u1');
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});

describe('clearSession', () => {
  test('expires the session cookie with the same flags', async () => {
    setNodeEnv('development');
    const r = res();
    await clearSession(req('retro_session=u1.s3cret'), r);
    expect(r.headers['set-cookie']).toBe('retro_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
  });

  test("deletes the request's Session row", async () => {
    await clearSession(req('retro_session=u1.s3cret'), res());
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', secret: 's3cret' } });
  });

  test('without a session cookie it only expires the cookie', async () => {
    const r = res();
    await clearSession(req('retro_session=nodot'), r);
    await clearSession(req(), r);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(r.headers['set-cookie']).toMatch(/^retro_session=; /);
  });

  test('still expires the cookie when the delete fails', async () => {
    deleteMany.mockRejectedValue(new Error('db down'));
    const r = res();
    await expect(clearSession(req('retro_session=u1.s'), r)).rejects.toThrow('db down');
    expect(r.headers['set-cookie']).toMatch(/^retro_session=; /);
  });
});

describe('endOtherSessions', () => {
  test("deletes the user's sessions except this request's", async () => {
    await endOtherSessions(req('retro_session=u1.mine'), 'u1');
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', NOT: { secret: 'mine' } } });
  });

  test('without a session cookie it deletes them all', async () => {
    await endOtherSessions(req(), 'u1');
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});

describe('getSessionUser', () => {
  const future = () => new Date(Date.now() + 60_000);

  test('no cookie, or a malformed one, never touches the database', async () => {
    expect(await getSessionUser(req())).toBeNull();
    expect(await getSessionUser(req('other=1'))).toBeNull();
    expect(await getSessionUser(req('retro_session=nodot'))).toBeNull();
    expect(await getSessionUser(req('retro_session=.secret'))).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  test('looks the session up by its unique secret and returns the user with betaKey', async () => {
    const user = { id: 'u1', betaKey: null };
    findUnique.mockResolvedValue({ userId: 'u1', expiresAt: future(), user });

    expect(await getSessionUser(req('csrf_token=t; retro_session=u1.s3cret'))).toBe(user);
    expect(findUnique).toHaveBeenCalledWith({
      where: { secret: 's3cret' },
      select: { userId: true, expiresAt: true, user: { include: { betaKey: true } } },
    });
  });

  test('select loads only the requested fields', async () => {
    findUnique.mockResolvedValue({ userId: 'u1', expiresAt: future(), user: { id: 'u1', did: 'did:x' } });
    const user = await getSessionUser(req('retro_session=u1.s'), { select: { id: true, did: true } });

    expect(user).toEqual({ id: 'u1', did: 'did:x' });
    // plus the moderation fields it needs, which it doesn't hand back
    expect(findUnique.mock.calls[0][0].select.user).toEqual({
      select: { id: true, did: true, moderationStatus: true, suspendedUntil: true },
    });
  });

  test('select can ask for the moderation fields too', async () => {
    findUnique.mockResolvedValue({
      userId: 'u1',
      expiresAt: future(),
      user: { id: 'u1', moderationStatus: 'active', suspendedUntil: null },
    });
    const user = await getSessionUser(req('retro_session=u1.s'), { select: { id: true, moderationStatus: true } });
    expect(user).toEqual({ id: 'u1', moderationStatus: 'active' });
  });

  test('a banned account → null, even with a live session', async () => {
    findUnique.mockResolvedValue({
      userId: 'u1',
      expiresAt: future(),
      user: { id: 'u1', moderationStatus: 'banned', suspendedUntil: null },
    });
    expect(await getSessionUser(req('retro_session=u1.s'))).toBeNull();
  });

  test('a suspended account → null until the end date, then back', async () => {
    const session = (suspendedUntil: Date) => ({
      userId: 'u1',
      expiresAt: future(),
      user: { id: 'u1', moderationStatus: 'suspended', suspendedUntil },
    });
    findUnique.mockResolvedValueOnce(session(future()));
    expect(await getSessionUser(req('retro_session=u1.s'))).toBeNull();
    findUnique.mockResolvedValueOnce(session(new Date(Date.now() - 1000)));
    expect(await getSessionUser(req('retro_session=u1.s'))).toMatchObject({ id: 'u1' });
  });

  test('expired session → null', async () => {
    findUnique.mockResolvedValue({ userId: 'u1', expiresAt: new Date(Date.now() - 1), user: { id: 'u1' } });
    expect(await getSessionUser(req('retro_session=u1.s'))).toBeNull();
  });

  test("someone else's secret with my user id → null", async () => {
    findUnique.mockResolvedValue({ userId: 'u2', expiresAt: future(), user: { id: 'u2' } });
    expect(await getSessionUser(req('retro_session=u1.s'))).toBeNull();
  });

  test('unknown secret → null', async () => {
    findUnique.mockResolvedValue(null);
    expect(await getSessionUser(req('retro_session=u1.s'))).toBeNull();
  });
});

describe('readCookie', () => {
  test('finds a cookie by exact name and decodes it', () => {
    expect(readCookie(req('a=1; retro_nonce=n%2E1; b=2'), 'retro_nonce')).toBe('n.1');
  });

  test('does not match a cookie whose name merely ends with the name', () => {
    expect(readCookie(req('xretro_session=u.s'), 'retro_session')).toBeNull();
  });

  test('a bad escape comes back raw instead of throwing', () => {
    expect(readCookie(req('retro_nonce=%E0%A4%A'), 'retro_nonce')).toBe('%E0%A4%A');
  });

  test('missing or empty → null', () => {
    expect(readCookie(req(), 'x')).toBeNull();
    expect(readCookie(req('x='), 'x')).toBeNull();
  });
});
