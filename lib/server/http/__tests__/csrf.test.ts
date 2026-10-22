/**
 * @jest-environment node
 *
 * Double-submit CSRF: the cookie (readable by our JS) must be echoed in the
 * X-CSRF-Token header. A cross-site form or fetch carries the cookie but
 * can't read it to set the header.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createCsrfCookie,
  generateCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  withCsrfProtection,
} from '../csrf';

const TOKEN = 'a'.repeat(64);

function req(opts: { method?: string; cookie?: string; header?: string | string[] } = {}): NextApiRequest {
  const headers: Record<string, string | string[]> = {};
  if (opts.cookie !== undefined) headers.cookie = opts.cookie;
  if (opts.header !== undefined) headers['x-csrf-token'] = opts.header;
  return { method: opts.method ?? 'POST', headers } as unknown as NextApiRequest;
}

function res() {
  const r = { statusCode: 200, body: undefined as unknown } as {
    statusCode: number;
    body: unknown;
    status: (c: number) => typeof r;
    json: (b: unknown) => typeof r;
  };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
}

describe('validateCsrfToken', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])('lets safe method %s through without a token', (method) => {
    expect(validateCsrfToken(req({ method }))).toBe(true);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post'])('requires a token for %s', (method) => {
    expect(validateCsrfToken(req({ method }))).toBe(false);
    expect(validateCsrfToken(req({ method, cookie: `csrf_token=${TOKEN}`, header: TOKEN }))).toBe(true);
  });

  it('treats a missing method as unsafe', () => {
    expect(validateCsrfToken({ headers: {} } as unknown as NextApiRequest)).toBe(false);
  });

  it('rejects cookie without header, header without cookie, and empty values', () => {
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}` }))).toBe(false);
    expect(validateCsrfToken(req({ header: TOKEN }))).toBe(false);
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}`, header: '' }))).toBe(false);
    expect(validateCsrfToken(req({ cookie: 'csrf_token=', header: '' }))).toBe(false);
  });

  it('rejects a mismatch, including a prefix and a different length', () => {
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}`, header: 'b'.repeat(64) }))).toBe(false);
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}`, header: TOKEN.slice(0, 32) }))).toBe(false);
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}`, header: TOKEN + 'a' }))).toBe(false);
  });

  it('finds the cookie among others, and decodes it', () => {
    const cookie = `session=xyz; csrf_token=${encodeURIComponent('a b')}; theme=dark`;
    expect(validateCsrfToken(req({ cookie, header: 'a b' }))).toBe(true);
  });

  it('uses the first value of a repeated header', () => {
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}`, header: [TOKEN, 'other'] }))).toBe(true);
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}`, header: [] }))).toBe(false);
  });

  // Cookie-name boundary and malformed %-escapes: csrf-cookie-parsing.test.ts
});

describe('withCsrfProtection', () => {
  it('sends 403 and never calls the handler on failure', async () => {
    const handler = jest.fn();
    const r = res();
    await withCsrfProtection(handler)(req(), r as unknown as NextApiResponse);
    expect(r.statusCode).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls the handler on success', async () => {
    const handler = jest.fn(async () => {});
    await withCsrfProtection(handler)(
      req({ cookie: `csrf_token=${TOKEN}`, header: TOKEN }),
      res() as unknown as NextApiResponse
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('refuses a cross-origin post even with a good token', async () => {
    const handler = jest.fn(async () => {});
    const r = res();
    const crossSite = req({ cookie: `csrf_token=${TOKEN}`, header: TOKEN });
    crossSite.headers['sec-fetch-site'] = 'same-site';
    await withCsrfProtection(handler)(crossSite, r as unknown as NextApiResponse);
    expect(r.statusCode).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('token + cookie', () => {
  it('generates 256-bit hex tokens that differ each time', () => {
    const a = generateCsrfToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(generateCsrfToken()).not.toBe(a);
  });

  it('cookie is JS-readable (no HttpOnly), SameSite=Lax, Secure only in production', () => {
    const env = process.env.NODE_ENV;
    try {
      const dev = createCsrfCookie('t');
      expect(dev).toBe('csrf_token=t; Path=/; Max-Age=604800; SameSite=Lax');
      (process.env as Record<string, string>).NODE_ENV = 'production';
      const prod = createCsrfCookie('t', 60);
      // __Host-: a subdomain can't set or shadow it
      expect(prod).toBe('__Host-csrf_token=t; Secure; Path=/; Max-Age=60; SameSite=Lax');
      expect(prod).not.toMatch(/HttpOnly/i);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = env!;
    }
  });
});

describe('cookie names in production', () => {
  const env = process.env.NODE_ENV;
  beforeEach(() => ((process.env as Record<string, string>).NODE_ENV = 'production'));
  afterEach(() => ((process.env as Record<string, string>).NODE_ENV = env!));

  it('checks the header against __Host-csrf_token', () => {
    expect(validateCsrfToken(req({ cookie: `__Host-csrf_token=${TOKEN}`, header: TOKEN }))).toBe(true);
    expect(getCsrfToken(req({ cookie: `__Host-csrf_token=${TOKEN}` }))).toBe(TOKEN);
  });

  it('still takes the old csrf_token when there is no __Host- one (sessions from before the rename)', () => {
    expect(validateCsrfToken(req({ cookie: `csrf_token=${TOKEN}`, header: TOKEN }))).toBe(true);
  });

  it('prefers __Host-csrf_token over a planted csrf_token', () => {
    const cookie = `csrf_token=${'b'.repeat(64)}; __Host-csrf_token=${TOKEN}`;
    expect(validateCsrfToken(req({ cookie, header: TOKEN }))).toBe(true);
    expect(validateCsrfToken(req({ cookie, header: 'b'.repeat(64) }))).toBe(false);
  });
});

describe('dev cookie names', () => {
  it('ignores a __Host- cookie', () => {
    expect(getCsrfToken(req({ cookie: `__Host-csrf_token=${TOKEN}` }))).toBeNull();
  });
});
