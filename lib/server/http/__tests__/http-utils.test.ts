/**
 * @jest-environment node
 */
import { resetServerEnvCache } from '@/lib/config/env';
import { getClientIp } from '../client-ip';
import { intParam, parseLimit, parseOffsetPagination, parsePagePagination } from '../pagination';
import { createMemoryRateLimiter } from '../rate-limit';

jest.mock('@/lib/config/database/connection', () => ({ db: {} }));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));

const req = (headers: Record<string, string | string[]>, remoteAddress?: string) =>
  ({ headers, socket: { remoteAddress } }) as unknown as Parameters<typeof getClientIp>[0];

describe('getClientIp', () => {
  // A two-proxy chain whose last proxy appends the address it saw (e.g. a CDN edge).
  const CF_EDGE = '172.70.1.1';

  it('with 2 hops, takes the second entry from the right', () => {
    expect(getClientIp(req({ 'x-forwarded-for': `203.0.113.7, ${CF_EDGE}` }, '127.0.0.1'), 2)).toBe('203.0.113.7');
    expect(getClientIp(req({ 'x-forwarded-for': ` 203.0.113.7 ,${CF_EDGE} ` }), 2)).toBe('203.0.113.7');
  });

  it('with 1 hop, takes the rightmost entry', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '203.0.113.7' }, '127.0.0.1'), 1)).toBe('203.0.113.7');
    expect(getClientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }), 1)).toBe('203.0.113.7');
  });

  it('ignores whatever the client put on the left', () => {
    const spoofs = ['6.6.6.6', '1.1.1.1, 2.2.2.2', 'not-an-ip', '', ' , ,'];
    for (const spoof of spoofs) {
      const xff = `${spoof}${spoof ? ', ' : ''}203.0.113.7, ${CF_EDGE}`;
      expect(getClientIp(req({ 'x-forwarded-for': xff }), 2)).toBe('203.0.113.7');
    }
    // A spoofed X-Real-IP loses to the proxy-written X-Forwarded-For.
    expect(getClientIp(req({ 'x-forwarded-for': `203.0.113.7, ${CF_EDGE}`, 'x-real-ip': '6.6.6.6' }), 2)).toBe('203.0.113.7');
  });

  it('joins repeated X-Forwarded-For headers in order', () => {
    expect(getClientIp(req({ 'x-forwarded-for': ['6.6.6.6', `203.0.113.7, ${CF_EDGE}`] }), 2)).toBe('203.0.113.7');
  });

  it('takes the leftmost entry when the chain is shorter than the hop count', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '198.51.100.2' }), 2)).toBe('198.51.100.2');
  });

  it('handles IPv6, ports and IPv4-mapped addresses', () => {
    expect(getClientIp(req({ 'x-forwarded-for': `2001:DB8::1, ${CF_EDGE}` }), 2)).toBe('2001:db8::1');
    expect(getClientIp(req({ 'x-forwarded-for': '203.0.113.7, 2400:cb00::1' }), 2)).toBe('203.0.113.7');
    expect(getClientIp(req({ 'x-forwarded-for': `[2001:db8::2]:443, ${CF_EDGE}` }), 2)).toBe('2001:db8::2');
    expect(getClientIp(req({ 'x-forwarded-for': `203.0.113.7:51234, ${CF_EDGE}` }), 2)).toBe('203.0.113.7');
    expect(getClientIp(req({}, '::ffff:127.0.0.1'), 2)).toBe('127.0.0.1');
    expect(getClientIp(req({}, '::1'), 2)).toBe('::1');
  });

  it('falls back to X-Real-IP, then the socket, then null', () => {
    expect(getClientIp(req({ 'x-real-ip': '203.0.113.8' }, '127.0.0.1'), 2)).toBe('203.0.113.8');
    expect(getClientIp(req({ 'x-forwarded-for': '' }, '::1'), 2)).toBe('::1');
    expect(getClientIp(req({ 'x-forwarded-for': 'garbage', 'x-real-ip': 'also garbage' }, '10.0.0.5'), 2)).toBe('10.0.0.5');
    expect(getClientIp(req({}), 2)).toBeNull();
  });

  it('with 0 hops, ignores the proxy headers', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '203.0.113.7', 'x-real-ip': '203.0.113.8' }, '10.0.0.5'), 0)).toBe('10.0.0.5');
  });

  it('defaults to TRUSTED_PROXY_HOPS', () => {
    const before = process.env.TRUSTED_PROXY_HOPS;
    try {
      process.env.TRUSTED_PROXY_HOPS = '2';
      resetServerEnvCache();
      expect(getClientIp(req({ 'x-forwarded-for': `203.0.113.7, ${CF_EDGE}` }))).toBe('203.0.113.7');
      // Unset → 1, production: nginx appends the visitor it resolved from CF-Connecting-IP.
      delete process.env.TRUSTED_PROXY_HOPS;
      resetServerEnvCache();
      expect(getClientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7, 203.0.113.7' }))).toBe('203.0.113.7');
      // Someone hitting the VPS directly: nginx appends their real address.
      expect(getClientIp(req({ 'x-forwarded-for': '6.6.6.6, 198.51.100.9' }))).toBe('198.51.100.9');
    } finally {
      if (before === undefined) delete process.env.TRUSTED_PROXY_HOPS;
      else process.env.TRUSTED_PROXY_HOPS = before;
      resetServerEnvCache();
    }
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
