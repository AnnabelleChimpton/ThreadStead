/**
 * The browser half of the double-submit check reads the CSRF cookie by its
 * exact name: `__Host-csrf_token` in production, `csrf_token` in dev. The
 * server (lib/server/http/csrf.ts) reads the same name.
 */
import { getCsrfToken } from '../csrf-fetch';

const TOKEN = 'a'.repeat(64);

// jsdom (rightly) won't store a __Host- cookie over http, so the header the
// page would see is stubbed instead
let cookieHeader = '';
beforeAll(() => {
  Object.defineProperty(document, 'cookie', { configurable: true, get: () => cookieHeader });
});
afterAll(() => {
  delete (document as unknown as Record<string, unknown>).cookie;
});

function setCookies(...cookies: string[]) {
  cookieHeader = cookies.join('; ');
}

test('reads csrf_token', () => {
  setCookies(`csrf_token=${TOKEN}`);
  expect(getCsrfToken()).toBe(TOKEN);
});

test('in production only __Host-csrf_token is read, never a planted csrf_token', () => {
  const env = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = 'production';
  try {
    setCookies(`csrf_token=${'b'.repeat(64)}`, `__Host-csrf_token=${TOKEN}`);
    expect(getCsrfToken()).toBe(TOKEN);
    setCookies(`csrf_token=${TOKEN}`);
    expect(getCsrfToken()).toBeNull();
  } finally {
    (process.env as Record<string, string>).NODE_ENV = env!;
  }
});

test('never reads a cookie whose name only ends with csrf_token', () => {
  setCookies(`x_csrf_token=${TOKEN}`);
  expect(getCsrfToken()).toBeNull();
  setCookies(`x_csrf_token=other`, `csrf_token=${TOKEN}`);
  expect(getCsrfToken()).toBe(TOKEN);
});

test('a malformed %-escape counts as missing', () => {
  setCookies('csrf_token=%E0%A4%A');
  expect(getCsrfToken()).toBeNull();
});
