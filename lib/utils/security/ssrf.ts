/**
 * SSRF guard for server-side fetches of user-supplied URLs (the Indie Index
 * bot: feeds, front pages, robots.txt).
 *
 * Refuses anything that isn't http(s) to a public address: the hostname is
 * resolved and EVERY address it resolves to must be public (not loopback,
 * private, link-local — 169.254.169.254 is the cloud metadata service —
 * CGNAT, multicast or reserved). Redirects are followed by hand so each hop
 * is checked too.
 *
 * Limitation: the address is checked, then fetch resolves it again, so a
 * DNS-rebinding host with a ~0 TTL could still flip between the two. Pinning
 * the checked address needs a custom undici dispatcher; not done yet.
 */
import { lookup } from 'dns/promises';
import { isIP } from 'net';

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

function isBlockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

/** Expand an IPv6 address to 8 hextets (handles `::` and a trailing dotted v4). */
function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase().split('%')[0];
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    addr = addr.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = addr.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail !== undefined && tail !== '' ? tail.split(':') : [];
  const fill = addr.includes('::') ? 8 - headParts.length - tailParts.length : 0;
  const parts = [...headParts, ...Array(fill).fill('0'), ...tailParts];
  if (parts.length !== 8) return null;
  return parts.map((p) => parseInt(p, 16));
}

function isBlockedV6(ip: string): boolean {
  const h = expandV6(ip);
  if (!h || h.some((x) => Number.isNaN(x))) return true;
  const allZeroUntil = (n: number) => h.slice(0, n).every((x) => x === 0);

  if (allZeroUntil(8)) return true; // ::
  if (allZeroUntil(7) && h[7] === 1) return true; // ::1
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) → judge the v4
  if (allZeroUntil(5) && (h[5] === 0xffff || h[5] === 0)) {
    return isBlockedV4(`${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`);
  }
  // NAT64 64:ff9b::/96 → judge the embedded v4
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
    return isBlockedV4(`${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`);
  }
  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
  if ((h[0] & 0xff00) === 0xff00) return true; // multicast
  if (h[0] === 0x2001 && h[1] === 0x0db8) return true; // documentation
  return false;
}

/** True for any address a server-side fetch must not reach. */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true; // not an IP at all — refuse
}

type Lookup = (hostname: string) => Promise<Array<{ address: string }>>;
const defaultLookup: Lookup = (hostname) => lookup(hostname, { all: true, verbatim: true });

/** Throws UnsafeUrlError unless `rawUrl` is http(s) to public addresses only. */
export async function assertPublicUrl(rawUrl: string, resolve: Lookup = defaultLookup): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(`Only http and https URLs can be fetched`);
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs with credentials are not allowed');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('That address is not public');
    return url;
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new UnsafeUrlError('That address is not public');
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await resolve(host);
  } catch {
    throw new UnsafeUrlError(`Could not resolve ${host}`);
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError('That address is not public');
  }
  return url;
}

/**
 * fetch() for user-supplied URLs: checks the URL and every redirect hop with
 * assertPublicUrl. Same signature as fetch plus a redirect cap.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  { maxRedirects = 5, resolve }: { maxRedirects?: number; resolve?: Lookup } = {}
): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; ; hop++) {
    await assertPublicUrl(current, resolve);
    const response = await fetch(current, { ...init, redirect: 'manual' });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      if (hop >= maxRedirects) throw new UnsafeUrlError('Too many redirects');
      // Drain so the connection can be reused.
      await response.body?.cancel().catch(() => {});
      current = new URL(location, current).toString();
      continue;
    }
    return response;
  }
}
