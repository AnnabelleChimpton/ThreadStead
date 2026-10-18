/**
 * @jest-environment node
 *
 * Login → Set-Cookie → /api/auth/me → logout, through the real routes and
 * the real session helpers (TECH_DEBT_AUDIT §2.4), with an in-memory Session
 * table. Covers both login paths: the emailed link (email-verify) and the
 * key signature used by seed-phrase and password login (verify), and that
 * logout and password change end sessions server-side, not just the cookie.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

type SessionRow = { userId: string; secret: string; expiresAt: Date };
const sessions: SessionRow[] = [];
const USERS: Record<string, any> = {
  'user-1': { id: 'user-1', did: 'did:key:one', role: 'member', primaryHandle: 'alice', betaKey: null },
};

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    session: {
      create: jest.fn(async ({ data }: { data: SessionRow }) => {
        sessions.push(data);
        return data;
      }),
      findUnique: jest.fn(async ({ where }: { where: { secret: string } }) => {
        const row = sessions.find((s) => s.secret === where.secret);
        return row ? { userId: row.userId, expiresAt: row.expiresAt, user: USERS[row.userId] } : null;
      }),
      deleteMany: jest.fn(async ({ where }: { where: { userId: string; secret?: string; NOT?: { secret: string } } }) => {
        const doomed = sessions.filter(
          (s) =>
            s.userId === where.userId &&
            (where.secret === undefined || s.secret === where.secret) &&
            (where.NOT === undefined || s.secret !== where.NOT.secret)
        );
        for (const row of doomed) sessions.splice(sessions.indexOf(row), 1);
        return { count: doomed.length };
      }),
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(async ({ where }: { where: { did?: string } }) =>
        Object.values(USERS).find((u) => where.did && u.did === where.did) ?? null
      ),
    },
  },
}));
jest.mock('@/lib/email-login', () => ({
  checkEmailLoginToken: jest.fn(),
  verifyEmailLoginToken: jest.fn(),
}));
// @noble/ed25519 is ESM-only and jest can't parse it; Node's Ed25519 does the
// same verification, so the signature check stays real.
jest.mock('@noble/ed25519', () => {
  const nodeCrypto = jest.requireActual('crypto');
  return {
    verifyAsync: async (sig: Uint8Array, msg: Uint8Array, pub: Uint8Array) =>
      nodeCrypto.verify(
        null,
        Buffer.from(msg),
        nodeCrypto.createPublicKey({
          key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(pub).toString('base64url') },
          format: 'jwk',
        }),
        Buffer.from(sig)
      ),
  };
});
// bcrypt at 12 rounds is slow and not what's under test here
jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(async (pw: string) => `hashed:${pw}`),
  verifyPassword: jest.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
}));
jest.mock('@/lib/server/http/rate-limit', () => ({
  signupLimitCheck: jest.fn().mockResolvedValue(true),
  rateLimitCheck: jest.fn().mockResolvedValue(true),
}));

import emailVerify from '@/pages/api/auth/email-verify';
import verify from '@/pages/api/auth/verify';
import me from '@/pages/api/auth/me';
import logout from '@/pages/api/auth/logout';
import changePassword from '@/pages/api/auth/change-password';
import { checkEmailLoginToken, verifyEmailLoginToken } from '@/lib/email-login';
import { toBase64Url } from '@/lib/utils/encoding/base64url';

type Route = (req: NextApiRequest, res: NextApiResponse) => unknown;

async function call(route: Route, { method = 'GET', body, cookie }: { method?: string; body?: unknown; cookie?: string } = {}) {
  const req = { method, body, url: '/api/test', query: {}, headers: cookie ? { cookie } : {} } as unknown as NextApiRequest;
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {} as Record<string, unknown>,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    end() {
      this.headersSent = true;
      return this;
    },
    setHeader(name: string, value: unknown) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
  };
  await route(req, res as NextApiResponse);
  return res as { statusCode: number; body: any; headers: Record<string, unknown> };
}

/** Turn Set-Cookie headers into the Cookie header a browser would send back. */
function cookieJar(setCookie: unknown): string {
  return ([] as string[])
    .concat(setCookie as string | string[])
    .map((c) => c.split(';')[0])
    .join('; ');
}

beforeEach(() => {
  sessions.length = 0;
  jest.clearAllMocks();
});

test('signed out, /me says so', async () => {
  const res = await call(me);
  expect(res.body).toEqual({ loggedIn: false });
});

test('email link login → cookie → /me → logout', async () => {
  const emailUser = { id: 'user-1', displayName: 'Alice', handle: 'alice', host: 'local', emailVerifiedAt: new Date() };
  (checkEmailLoginToken as jest.Mock).mockResolvedValue([emailUser]);
  (verifyEmailLoginToken as jest.Mock).mockResolvedValue([emailUser]);

  const login = await call(emailVerify, { method: 'POST', body: { token: 'tok' } });
  expect(login.statusCode).toBe(200);
  expect(login.body).toMatchObject({ success: true, userId: 'user-1' });

  const [sessionCookie, csrfCookie] = login.headers['set-cookie'] as string[];
  expect(sessionCookie).toMatch(/^retro_session=user-1\.[0-9a-f]{64}; HttpOnly; (Secure; )?Path=\/; Max-Age=604800; SameSite=Strict$/);
  expect(csrfCookie).toMatch(/^csrf_token=[0-9a-f]{64};/);
  expect(sessions).toHaveLength(1);

  const cookie = cookieJar(login.headers['set-cookie']);
  const meRes = await call(me, { cookie });
  expect(meRes.body).toEqual({
    loggedIn: true,
    user: { id: 'user-1', did: 'did:key:one', role: 'member', primaryHandle: 'alice' },
  });

  const out = await call(logout, { method: 'POST', cookie });
  expect(out.headers['set-cookie']).toMatch(/^retro_session=; HttpOnly; (Secure; )?Path=\/; Max-Age=0; SameSite=Strict$/);
  expect((await call(me, { cookie: cookieJar(out.headers['set-cookie']) })).body).toEqual({ loggedIn: false });

  // a copy of the old cookie no longer works either
  expect(sessions).toHaveLength(0);
  expect((await call(me, { cookie })).body).toEqual({ loggedIn: false });
});

async function emailLogin(): Promise<string> {
  const emailUser = { id: 'user-1', emailVerifiedAt: new Date() };
  (checkEmailLoginToken as jest.Mock).mockResolvedValue([emailUser]);
  (verifyEmailLoginToken as jest.Mock).mockResolvedValue([emailUser]);
  const login = await call(emailVerify, { method: 'POST', body: { token: 'tok' } });
  return cookieJar(login.headers['set-cookie']);
}

test('logout ends only its own session', async () => {
  const laptop = await emailLogin();
  const phone = await emailLogin();

  await call(logout, { cookie: laptop });
  expect((await call(me, { cookie: laptop })).body).toEqual({ loggedIn: false });
  expect((await call(me, { cookie: phone })).body).toMatchObject({ loggedIn: true });
});

test('password change keeps this session and ends the others', async () => {
  USERS['user-1'] = { ...USERS['user-1'], authMethod: 'PASSWORD', passwordHash: 'hashed:old-password' };
  try {
    const laptop = await emailLogin();
    const phone = await emailLogin();

    const wrong = await call(changePassword, {
      method: 'POST',
      cookie: laptop,
      body: { currentPassword: 'nope', newPassword: 'new-password' },
    });
    expect(wrong.statusCode).toBe(400);
    expect(sessions).toHaveLength(2);

    const changed = await call(changePassword, {
      method: 'POST',
      cookie: laptop,
      body: { currentPassword: 'old-password', newPassword: 'new-password' },
    });
    expect(changed.body).toEqual({ success: true });
    expect((await call(me, { cookie: laptop })).body).toMatchObject({ loggedIn: true });
    expect((await call(me, { cookie: phone })).body).toEqual({ loggedIn: false });
  } finally {
    const { authMethod: _a, passwordHash: _p, ...rest } = USERS['user-1'];
    USERS['user-1'] = rest;
  }
});

test('signature login (seed phrase / password) → cookie → /me', async () => {
  const { publicKey: pubKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicKey = Buffer.from(pubKey.export({ format: 'jwk' }).x!, 'base64url');
  const did = `did:key:ed25519:${toBase64Url(publicKey)}`;
  USERS['user-2'] = { id: 'user-2', did, role: 'member', primaryHandle: 'bob', betaKey: null };

  const nonce = 'nonce-123';
  const signature = crypto.sign(null, Buffer.from(nonce), privateKey);
  const login = await call(verify, {
    method: 'POST',
    cookie: `retro_nonce=${nonce}.${Date.now() + 60_000}`,
    body: { did, publicKey: toBase64Url(publicKey), signature: toBase64Url(signature) },
  });
  expect(login.statusCode).toBe(200);
  expect(login.body).toEqual({ ok: true, userId: 'user-2' });
  expect(login.headers['set-cookie']).toEqual([
    expect.stringMatching(/^retro_session=user-2\.[0-9a-f]{64}; HttpOnly; (Secure; )?Path=\/; Max-Age=604800; SameSite=Strict$/),
    expect.stringMatching(/^csrf_token=/),
  ]);

  const meRes = await call(me, { cookie: cookieJar(login.headers['set-cookie']) });
  expect(meRes.body.user).toMatchObject({ id: 'user-2', primaryHandle: 'bob' });
});

test('a bad signature gets no session', async () => {
  const { publicKey: pubKey } = crypto.generateKeyPairSync('ed25519');
  const { privateKey: otherKey } = crypto.generateKeyPairSync('ed25519');
  const publicKey = Buffer.from(pubKey.export({ format: 'jwk' }).x!, 'base64url');
  const res = await call(verify, {
    method: 'POST',
    cookie: `retro_nonce=n.${Date.now() + 60_000}`,
    body: { did: 'did:x', publicKey: toBase64Url(publicKey), signature: toBase64Url(crypto.sign(null, Buffer.from('n'), otherKey)) },
  });
  expect(res.statusCode).toBe(401);
  expect(sessions).toHaveLength(0);
  expect(res.headers['set-cookie']).toBeUndefined();
});

test('a tampered or expired cookie is signed out', async () => {
  (checkEmailLoginToken as jest.Mock).mockResolvedValue([{ id: 'user-1', emailVerifiedAt: new Date() }]);
  const login = await call(emailVerify, { method: 'POST', body: { token: 'tok' } });
  const cookie = cookieJar(login.headers['set-cookie']);

  expect((await call(me, { cookie: cookie.replace('retro_session=user-1.', 'retro_session=user-2.') })).body).toEqual({
    loggedIn: false,
  });

  sessions[0].expiresAt = new Date(Date.now() - 1);
  expect((await call(me, { cookie })).body).toEqual({ loggedIn: false });
});
