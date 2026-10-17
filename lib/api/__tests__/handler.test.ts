/**
 * @jest-environment node
 *
 * apiHandler (TECH_DEBT_AUDIT §2.1): one session lookup per request, the
 * fixed check order (405 → api key → rate limit → CSRF → 401/403 → schema),
 * and consistent `{ error }` bodies.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/middleware/generalRateLimiting', () => ({ rateLimitCheck: jest.fn() }));

import { apiHandler, ApiError } from '@/lib/api/handler';
import { getSessionUser } from '@/lib/auth/server';
import { rateLimitCheck } from '@/lib/middleware/generalRateLimiting';

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

  test('400 with details for an invalid body', async () => {
    const res = await call(route, { method: 'POST', body: { name: '' }, headers: withCsrf });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation error');
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
