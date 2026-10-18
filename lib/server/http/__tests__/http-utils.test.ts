/**
 * @jest-environment node
 */
import { getClientIp } from '../client-ip';
import { intParam, parseLimit, parseOffsetPagination, parsePagePagination } from '../pagination';
import { createMemoryRateLimiter } from '../rate-limit';

jest.mock('@/lib/config/database/connection', () => ({ db: {} }));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));

const req = (headers: Record<string, string | string[]>, remoteAddress?: string) =>
  ({ headers, socket: { remoteAddress } }) as unknown as Parameters<typeof getClientIp>[0];

describe('getClientIp', () => {
  it('takes the first X-Forwarded-For hop, trimmed', () => {
    expect(getClientIp(req({ 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1' }, '127.0.0.1'))).toBe('203.0.113.7');
    expect(getClientIp(req({ 'x-forwarded-for': ['198.51.100.2, 10.0.0.1'] }))).toBe('198.51.100.2');
  });

  it('falls back to the socket address, then null', () => {
    expect(getClientIp(req({}, '::1'))).toBe('::1');
    expect(getClientIp(req({ 'x-forwarded-for': '' }, '::1'))).toBe('::1');
    expect(getClientIp(req({}))).toBeNull();
  });
});

describe('pagination', () => {
  it('falls back on missing or non-numeric values and clamps the rest', () => {
    expect(intParam(undefined, { fallback: 7 })).toBe(7);
    expect(intParam('abc', { fallback: 7 })).toBe(7);
    expect(intParam(['12', '99'], { fallback: 7 })).toBe(12);
    expect(intParam('-5', { fallback: 0, min: 0 })).toBe(0);
    expect(parseLimit('500', { fallback: 20, max: 50 })).toBe(50);
    expect(parseLimit('0', { fallback: 20 })).toBe(1);
    expect(parseLimit('500', { fallback: 20 })).toBe(500); // no max given → unbounded, as before
  });

  it('parses offset and page styles', () => {
    expect(parseOffsetPagination({}, { defaultLimit: 20, maxLimit: 50 })).toEqual({ limit: 20, offset: 0 });
    expect(parseOffsetPagination({ limit: '30', offset: '60' }, { defaultLimit: 20, maxLimit: 50 })).toEqual({ limit: 30, offset: 60 });
    expect(parsePagePagination({ page: '3', limit: '10' }, { defaultLimit: 20 })).toEqual({ page: 3, limit: 10, skip: 20 });
    expect(parsePagePagination({ page: 'x' }, { defaultLimit: 20, maxLimit: 100 })).toEqual({ page: 1, limit: 20, skip: 0 });
  });
});

describe('createMemoryRateLimiter', () => {
  afterEach(() => jest.useRealTimers());

  it('enforces every window, reports the first full one, and does not count rejections', () => {
    jest.useFakeTimers();
    const limiter = createMemoryRateLimiter([
      { name: 'burst', max: 2, windowMs: 1000 },
      { name: 'sustained', max: 3, windowMs: 10_000 },
    ]);

    expect(limiter.check('a')).toEqual({ allowed: true });
    expect(limiter.check('a')).toEqual({ allowed: true });
    expect(limiter.check('a')).toEqual({ allowed: false, reason: 'burst' });
    expect(limiter.check('b')).toEqual({ allowed: true }); // keys are independent

    jest.advanceTimersByTime(1001);
    expect(limiter.check('a')).toEqual({ allowed: true });
    expect(limiter.check('a')).toEqual({ allowed: false, reason: 'sustained' });

    jest.advanceTimersByTime(10_000);
    expect(limiter.check('a')).toEqual({ allowed: true });
    limiter.stop();
  });

  it('sweeps idle keys', () => {
    jest.useFakeTimers();
    const limiter = createMemoryRateLimiter([{ name: 'w', max: 1, windowMs: 1000 }], { sweepEveryMs: 5000 });
    limiter.check('a');
    expect(limiter.size).toBe(1);
    jest.advanceTimersByTime(5000);
    expect(limiter.size).toBe(0);
    limiter.stop();
  });
});
