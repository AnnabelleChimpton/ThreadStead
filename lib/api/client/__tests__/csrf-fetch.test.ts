/**
 * The browser half of the double-submit check reads the CSRF cookie by its
 * exact name: `__Host-csrf_token` in production, `csrf_token` before the
 * rename and in dev. The server (lib/server/http/csrf.ts) reads the same
 * names in the same order.
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

test('prefers __Host-csrf_token over csrf_token', () => {
  setCookies(`csrf_token=${'b'.repeat(64)}`, `__Host-csrf_token=${TOKEN}`);
  expect(getCsrfToken()).toBe(TOKEN);
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
