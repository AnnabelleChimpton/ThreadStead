/**
 * @jest-environment node
 *
 * apiHandler (TECH_DEBT_AUDIT §2.1): one session lookup per request, the
 * fixed check order (405 → api key → rate limit → same origin → CSRF →
 * 401/403 → schema), a leaving resident's writes refused with the reason,
 * and consistent `{ error }` bodies.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn() }));

import { apiHandler, ApiError } from '@/lib/api/handler';
import { getSessionUser } from '@/lib/auth/server';
import { rateLimitCheck } from '@/lib/server/http/rate-limit';
import { CROSS_ORIGIN_ERROR, getSiteOrigin } from '@/lib/server/http/same-origin';

const mockSession = getSessionUser as jest.Mock;
const mockRateLimit = rateLimitCheck as jest.Mock;

const ADMIN = { id: 'u-admin', role: 'admin', primaryHandle: 'root' };
const MEMBER = { id: 'u-1', role: 'member', primaryHandle: 'alice' };
const CSRF = 'tok123';

function call(
  route: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  { method = 'GET', body, headers = {} }: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
) {
  const req = { method, body, headers, url: '/api/test', query: {} } as unknown as NextApiRequest;
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    headers: {} as Record<string, string>,
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
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
  return route(req, res).then(() => res as { statusCode: number; body: any; headers: Record<string, string> });
}

const withCsrf = { cookie: `csrf_token=${CSRF}`, 'x-csrf-token': CSRF };

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue(ADMIN);
  mockRateLimit.mockResolvedValue(true);
});

describe('methods', () => {
  test('405 with an Allow header and an { error } body, before any session lookup', async () => {
    const route = apiHandler({ methods: ['GET', 'POST'], auth: 'admin' }, async (_req, res) => res.json({}));
    const res = await call(route, { method: 'DELETE' });
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
    expect(res.body).toEqual({ error: 'Method not allowed' });
    expect(mockSession).not.toHaveBeenCalled();
  });
});

describe('auth', () => {
  const route = apiHandler({ methods: ['GET'], auth: 'admin' }, async (_req, res, { user }) =>
    res.status(200).json({ id: user.id })
  );

  test('401 when signed out', async () => {
    mockSession.mockResolvedValue(null);
    const res = await call(route);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  test('403 for a non-admin', async () => {
    mockSession.mockResolvedValue(MEMBER);
    const res = await call(route);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Admin access required' });
  });

  test('admin reaches the handler with ctx.user', async () => {
    const res = await call(route);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: 'u-admin' });
  });

  test("'user' lets any signed-in user in; 'optional' passes null through", async () => {
    mockSession.mockResolvedValue(MEMBER);
    const userRoute = apiHandler({ methods: ['GET'], auth: 'user' }, async (_req, res, { user }) => res.json({ id: user.id }));
    expect((await call(userRoute)).body).toEqual({ id: 'u-1' });

    mockSession.mockResolvedValue(null);
    const optional = apiHandler({ methods: ['GET'], auth: 'optional' }, async (_req, res, { user }) => res.json({ user }));
    expect((await call(optional)).body).toEqual({ user: null });
  });

  test("'none' never touches the Session table", async () => {
    const route = apiHandler({ methods: ['GET'], auth: 'none' }, async (_req, res) => res.json({ ok: true }));
    await call(route);
    expect(mockSession).not.toHaveBeenCalled();
  });
});

describe('someone leaving', () => {
  const LEAVING = { ...MEMBER, deletesAt: new Date('2026-11-06T12:00:00Z') };
  const echo = async (_req: NextApiRequest, res: NextApiResponse, { user }: { user: { id: string } | null }) =>
    res.json({ user: user?.id ?? null });
  const post = { method: 'POST', headers: withCsrf };

  beforeEach(() => mockSession.mockResolvedValue(LEAVING));

  test('reads as before', async () => {
    const route = apiHandler({ methods: ['GET'], auth: 'user' }, echo);
    expect((await call(route)).body).toEqual({ user: 'u-1' });
  });

  test("a write is refused with the reason, on 'user' and 'optional' routes", async () => {
    for (const auth of ['user', 'optional'] as const) {
      const handler = jest.fn();
      const res = await call(apiHandler({ methods: ['POST'], auth }, handler), post);
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ error: expect.stringContaining('Keep my account'), code: 'account_leaving' });
      expect(handler).not.toHaveBeenCalled();
    }
    expect(mockSession).toHaveBeenCalledWith(expect.anything(), { whileLeaving: true });
  });

  test("'none' just has no user, and the limit is still theirs", async () => {
    const route = apiHandler({ methods: ['POST'], auth: 'none', rateLimit: 'auth' }, echo);
    expect((await call(route, post)).body).toEqual({ user: null });
    expect(mockRateLimit).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'auth', 'u-1');
  });

  test('a whileLeaving route lets them write', async () => {
    const route = apiHandler({ methods: ['POST'], auth: 'user', whileLeaving: true }, echo);
    expect((await call(route, post)).body).toEqual({ user: 'u-1' });
  });

  test('the CSRF check still comes first', async () => {
    const route = apiHandler({ methods: ['POST'], auth: 'user' }, echo);
    expect((await call(route, { method: 'POST' })).body).toMatchObject({ error: 'CSRF token validation failed' });
  });
});

describe('session is resolved once', () => {
  test('rate limit + CSRF + admin check share one getSessionUser call', async () => {
    const route = apiHandler({ methods: ['POST'], auth: 'admin', rateLimit: 'admin' }, async (_req, res) => res.json({}));
    await call(route, { method: 'POST', headers: withCsrf });
    expect(mockSession).toHaveBeenCalledTimes(1);
    expect(mockRateLimit).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'admin', 'u-admin');
  });
});

describe('rate limit', () => {
  test('stops the request when the limiter already responded', async () => {
    mockRateLimit.mockImplementation(async (_req, res) => {
      res.status(429).json({ error: 'Too many requests' });
      return false;
    });
    const handler = jest.fn();
    const route = apiHandler({ methods: ['GET'], auth: 'admin', rateLimit: 'admin' }, handler);
    const res = await call(route);
    expect(res.statusCode).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  test('is not applied unless asked for', async () => {
    const route = apiHandler({ methods: ['GET'], auth: 'admin' }, async (_req, res) => res.json({}));
    await call(route);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });
});

describe('CSRF', () => {
  const route = apiHandler({ methods: ['GET', 'POST', 'DELETE'], auth: 'admin' }, async (_req, res) => res.json({ ok: true }));

  test('rejects a write without a matching token, before the auth check', async () => {
    mockSession.mockResolvedValue(null);
    const res = await call(route, { method: 'POST' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('CSRF token validation failed');
  });

  test('applies to DELETE', async () => {
    expect((await call(route, { method: 'DELETE' })).statusCode).toBe(403);
    expect((await call(route, { method: 'DELETE', headers: withCsrf })).statusCode).toBe(200);
  });

  test('is a no-op for GET', async () => {
    expect((await call(route)).statusCode).toBe(200);
  });

  test('csrf: false opts out', async () => {
    const open = apiHandler({ methods: ['POST'], auth: 'admin', csrf: false }, async (_req, res) => res.json({}));
    expect((await call(open, { method: 'POST' })).statusCode).toBe(200);
  });
});

describe('same-origin check (lib/server/http/same-origin.ts)', () => {
  const SITE = getSiteOrigin();
  const strict = apiHandler({ methods: ['GET', 'POST'], auth: 'admin' }, async (_req, res) => res.json({ ok: true }));
  const open = apiHandler({ methods: ['POST'], auth: 'none', csrf: false }, async (_req, res) => res.json({ ok: true }));

  test.each([
    ['a resident subdomain', { 'sec-fetch-site': 'same-site' }],
    ['another site', { 'sec-fetch-site': 'cross-site' }],
    ['another Origin (no Sec-Fetch-Site)', { origin: 'https://alice.example.com' }],
    ['Origin null (sandboxed frame)', { origin: 'null' }],
  ])('refuses a post from %s, even with csrf: false and a good token', async (_name, from) => {
    for (const route of [strict, open]) {
      const res = await call(route, { method: 'POST', headers: { ...withCsrf, ...from } });
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ error: CROSS_ORIGIN_ERROR });
    }
  });

  test.each([
    ['Sec-Fetch-Site: same-origin', { 'sec-fetch-site': 'same-origin' }],
    ['the site Origin', { origin: SITE }],
    ['no browser headers at all (a script, not a browser)', {}],
  ])('lets a post with %s through', async (_name, from) => {
    expect((await call(open, { method: 'POST', headers: from })).statusCode).toBe(200);
    expect((await call(strict, { method: 'POST', headers: { ...withCsrf, ...from } })).statusCode).toBe(200);
  });

  test('Sec-Fetch-Site wins over a matching Origin', async () => {
    const res = await call(open, { method: 'POST', headers: { origin: SITE, 'sec-fetch-site': 'same-site' } });
    expect(res.statusCode).toBe(403);
  });

  test('GET from anywhere is fine', async () => {
    expect((await call(strict, { headers: { 'sec-fetch-site': 'cross-site' } })).statusCode).toBe(200);
  });

  test('an API-key caller is not a browser and skips it', async () => {
    const keyed = apiHandler({ methods: ['POST'], auth: 'admin', apiKey: () => 'k' }, async (_req, res) => res.json({}));
    const res = await call(keyed, { method: 'POST', headers: { authorization: 'Bearer k', origin: 'https://elsewhere.test' } });
    expect(res.statusCode).toBe(200);
  });
});

describe('apiKey', () => {
  const KEY = 'crawler-secret';
  let key: string | undefined = KEY;
  const route = apiHandler(
    { methods: ['POST'], auth: 'admin', rateLimit: 'admin', apiKey: () => key },
    async (_req, res, { user, viaApiKey }) => res.json({ user, viaApiKey })
  );
  afterEach(() => {
    key = KEY;
  });

  test('a matching bearer token skips session, CSRF and the admin check', async () => {
    mockSession.mockResolvedValue(null);
    const res = await call(route, { method: 'POST', headers: { authorization: `Bearer ${KEY}` } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ user: null, viaApiKey: true });
    expect(mockSession).not.toHaveBeenCalled();
    expect(mockRateLimit).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'admin', undefined);
  });

  test('a wrong token falls back to normal session auth', async () => {
    mockSession.mockResolvedValue(null);
    const res = await call(route, { method: 'POST', headers: { authorization: 'Bearer nope', ...withCsrf } });
    expect(res.statusCode).toBe(401);
  });

  test('an unset key disables the path (an empty bearer never matches)', async () => {
    key = undefined;
    mockSession.mockResolvedValue(null);
    const res = await call(route, { method: 'POST', headers: { authorization: 'Bearer ', ...withCsrf } });
    expect(res.statusCode).toBe(401);
  });
});

describe('schema', () => {
  const route = apiHandler(
    { methods: ['GET', 'POST'], auth: 'admin', schema: z.object({ name: z.string().min(1) }) },
    async (_req, res, { body }) => res.json({ body })
  );

  test('400 that says what to fix, with details, for an invalid body', async () => {
    const res = await call(route, { method: 'POST', body: { name: '' }, headers: withCsrf });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Name can't be empty.");
    expect(res.body.details[0].path).toEqual(['name']);
  });

  test('passes the parsed body (unknown keys stripped) to the handler', async () => {
    const res = await call(route, { method: 'POST', body: { name: 'x', extra: 1 }, headers: withCsrf });
    expect(res.body).toEqual({ body: { name: 'x' } });
  });

  test('is not applied to GET', async () => {
    expect((await call(route)).statusCode).toBe(200);
  });
});

describe('errors thrown by the handler', () => {
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  test('ApiError → its status and { error }', async () => {
    const route = apiHandler({ methods: ['GET'], auth: 'admin' }, async () => {
      throw new ApiError(404, 'Poll not found');
    });
    const res = await call(route);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Poll not found' });
  });

  test('ZodError from an in-handler parse → 400', async () => {
    const route = apiHandler({ methods: ['GET'], auth: 'admin' }, async () => {
      z.object({ n: z.number() }).parse({ n: 'x' });
    });
    expect((await call(route)).statusCode).toBe(400);
  });

  test('anything else → logged 500 without leaking the message', async () => {
    const route = apiHandler({ methods: ['GET'], auth: 'admin' }, async () => {
      throw new Error('db exploded: password=hunter2');
    });
    const res = await call(route);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(errorSpy).toHaveBeenCalled();
  });

  test('does not try to respond twice', async () => {
    const route = apiHandler({ methods: ['GET'], auth: 'admin' }, async (_req, res) => {
      res.status(200).json({ ok: true });
      throw new Error('late');
    });
    const res = await call(route);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
