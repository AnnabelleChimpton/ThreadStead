/**
 * @jest-environment node
 *
 * The cross-origin rule for state-changing requests. A resident subdomain is
 * same-site with the main site, so SameSite cookies don't stop its forms;
 * Sec-Fetch-Site / Origin do.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => 'https://homepageagain.com' }));

import { getSiteOrigin, isSameOriginRequest, sameOriginProtection } from '../same-origin';

const req = (headers: Record<string, string | string[]>, method = 'POST') =>
  ({ method, headers }) as unknown as NextApiRequest;

function res() {
  const r = { statusCode: 200, body: undefined as unknown } as any;
  r.status = (c: number) => ((r.statusCode = c), r);
  r.json = (b: unknown) => ((r.body = b), r);
  return r as NextApiResponse & { statusCode: number; body: unknown };
}

test('the site origin comes from NEXT_PUBLIC_BASE_URL, without a path or slash', () => {
  expect(getSiteOrigin()).toBe('https://homepageagain.com');
});

describe('isSameOriginRequest', () => {
  test.each([
    [{ 'sec-fetch-site': 'same-origin' }, true],
    [{ 'sec-fetch-site': 'none' }, true],
    [{ 'sec-fetch-site': 'same-site' }, false],
    [{ 'sec-fetch-site': 'cross-site' }, false],
    [{ origin: 'https://homepageagain.com' }, true],
    [{ origin: 'https://alice.homepageagain.com' }, false],
    [{ origin: 'http://homepageagain.com' }, false],
    [{ origin: 'https://homepageagain.com.evil.test' }, false],
    [{ origin: 'null' }, false],
    [{ origin: 'https://homepageagain.com', 'sec-fetch-site': 'cross-site' }, false],
    [{ origin: 'https://evil.test', 'sec-fetch-site': 'same-origin' }, true],
    [{ 'sec-fetch-site': ['same-origin', 'cross-site'] }, true],
    [{}, true],
  ])('%j → %s', (headers, expected) => {
    expect(isSameOriginRequest(req(headers))).toBe(expected);
  });
});

describe('sameOriginProtection', () => {
  test.each(['GET', 'HEAD', 'OPTIONS'])('%s always passes', (method) => {
    const r = res();
    expect(sameOriginProtection(req({ 'sec-fetch-site': 'cross-site' }, method), r)).toBe(true);
    expect(r.statusCode).toBe(200);
  });

  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s from a subdomain gets a 403', (method) => {
    const r = res();
    expect(sameOriginProtection(req({ 'sec-fetch-site': 'same-site' }, method), r)).toBe(false);
    expect(r.statusCode).toBe(403);
    expect(r.body).toEqual({ error: expect.any(String) });
  });
});
