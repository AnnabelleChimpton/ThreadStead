/**
 * Residents' addresses: alice.homepageagain.com
 * (design/home-subdomains/SCOPE.md). The address serves the resident's page
 * at /, signed out and read-only, and /.well-known/atproto-did, so it works
 * as their Bluesky handle. Every other page is on the main site.
 *
 * No Node or Prisma imports: middleware.ts runs this on the edge runtime.
 */

/** A DNS label: lowercase letters, digits and inner hyphens, 63 at most. */
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Hosts under the apex that stay the main site (Phase 2 redirects www). */
const MAIN_SITE_LABELS = new Set(['www']);

/**
 * Labels that have, or may one day have, their own DNS record. A record
 * beats the wildcard, so a resident holding one of these names would lose
 * their address (and Bluesky handle) the day the record appears. New
 * signups can't take them (lib/domain/validation/username.ts); existing
 * holders keep their username but can't link Bluesky.
 */
export const INFRA_LABELS: ReadonlySet<string> = new Set([
  'www', 'cdn', 'static', 'assets', 'media', 'img', 'files', 'uploads',
  'api', 'hub', 'ringhub', 'matrix', 'rtc', 'chat',
  'staging', 'dev', 'test', 'beta', 'preview', 'app',
  'auth', 'sso', 'oauth', 'id', 'account', 'accounts',
  'mail', 'email', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'mta-sts',
  'ns', 'ns1', 'ns2', 'autoconfig', 'autodiscover', 'wpad',
  'localhost', 'internal', 'bsky', 'atproto', 'pds', 'did',
]);

/** A username as an address label: `_` isn't allowed in hostnames, so it becomes `-`. */
export function subdomainLabelFor(username: string): string {
  return username.trim().toLowerCase().replace(/_/g, '-');
}

export function isValidLabel(label: string): boolean {
  return LABEL_RE.test(label);
}

/**
 * The domain residents' addresses sit under, or null when there are none.
 * RESIDENT_SUBDOMAIN_APEX overrides it (homepageagain.localhost for trying
 * it locally). With the base URL on localhost or an IP there are none, so
 * the browser pane's `<name>.localhost` sign-in trick keeps working.
 */
export function residentApex(
  env: { RESIDENT_SUBDOMAIN_APEX?: string; NEXT_PUBLIC_BASE_URL?: string } = {
    RESIDENT_SUBDOMAIN_APEX: process.env.RESIDENT_SUBDOMAIN_APEX,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  }
): string | null {
  const configured = env.RESIDENT_SUBDOMAIN_APEX?.trim().toLowerCase();
  if (configured) return configured;
  let host: string;
  try {
    host = new URL(env.NEXT_PUBLIC_BASE_URL ?? '').hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host || host === 'localhost' || /^[\d.]+$/.test(host) || host.startsWith('[')) return null;
  return host;
}

/** alice.homepageagain.com, or null when the label can't be an address. */
export function residentAddress(label: string | null | undefined, apex = residentApex()): string | null {
  if (!label || !apex || !isValidLabel(label)) return null;
  return `${label}.${apex}`;
}

export const ATPROTO_DID_PATH = '/.well-known/atproto-did';

/** How middleware.ts tells the rewritten routes which address was asked for. */
export const RESIDENT_LABEL_HEADER = 'x-resident-label';

/**
 * The label a rewritten route was called for: middleware's header, else
 * the [label] in the path (a direct call, or dev). Empty when neither is a label.
 */
export function requestedLabel(req: {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
}): string {
  const header = req.headers[RESIDENT_LABEL_HEADER];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  const fromQuery = typeof req.query.label === 'string' ? req.query.label : '';
  const label = (fromHeader || fromQuery).trim().toLowerCase();
  return isValidLabel(label) ? label : '';
}

/**
 * Static files a resident's page loads from its own host. Everything here
 * is public and reads no session.
 */
const STATIC_PREFIXES = [
  '/_next/static/', '/_next/image', '/assets/', '/fonts/', '/audio/', '/pixel-homes/',
  '/uploads/', '/_local-r2/',
];
const STATIC_FILES = new Set([
  '/favicon.ico', '/favicon-16x16.png', '/favicon-32x32.png', '/og-image.png', '/image-icon-square.png', '/robots.txt',
]);

/**
 * The public GET reads a resident's page makes from the browser: the site
 * chrome, the profile tabs and the template components. On a resident's
 * host they run signed out (middleware strips the Cookie header), so they
 * answer what anyone could read on the main site. Any other /api path is a
 * 404 there.
 */
const RESIDENT_API_READS: RegExp[] = [
  /^\/api\/(auth\/me|site-config|site-css|custom-pages|emojis|signup-audio|image-proxy)$/,
  /^\/api\/(posts|guestbook|mutuals|rel|profile)\/[^/]+$/,
  /^\/api\/profile\/[^/]+\/source$/,
  /^\/api\/photos\/(featured\/)?[^/]+$/,
  /^\/api\/users\/[^/]+\/badges$/,
  /^\/api\/home\/[^/]+\/badge$/,
  /^\/api\/media\/(serve|midi)\/[^/]+$/,
];

export function isResidentApiRead(pathname: string): boolean {
  return RESIDENT_API_READS.some((re) => re.test(pathname));
}

function isStaticPath(pathname: string): boolean {
  if (STATIC_FILES.has(pathname)) return true;
  // Next's page data would let a client-side link render any page here
  // (/login, /settings); a 404 makes the router load the page for real,
  // which middleware sends to the main site.
  if (pathname.startsWith('/_next/data/')) return false;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs')) return true;
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export type SubdomainRoute =
  /** Not a resident's host: the main site carries on as usual */
  | { kind: 'main' }
  /** The Bluesky handle check. Never redirected. */
  | { kind: 'atproto-did'; label: string }
  /** GET /: the resident's page, signed out and read-only (pages/site/[label].tsx) */
  | { kind: 'site'; label: string }
  /** Static files and the public API reads the page needs, signed out */
  | { kind: 'pass'; label: string }
  /** Federation paths, other API paths and malformed hosts */
  | { kind: 'not-found' }
  /** Any other page: the same path on the main site, where sessions live */
  | { kind: 'main-site'; label: string };

function hostname(hostHeader: string | null | undefined): string {
  let host = (hostHeader ?? '').trim().toLowerCase();
  if (host.startsWith('[')) return host; // IPv6 literal
  host = host.replace(/:\d+$/, '');
  return host.endsWith('.') ? host.slice(0, -1) : host;
}

/**
 * Where a request goes, from its Host header and path. Deny by default: a
 * resident's host serves their page, the files and reads it needs, and the
 * Bluesky check; every other page is on the main site. The atproto path is
 * checked before anything that redirects: Bluesky's resolver follows
 * redirects, so if this path ever ended up on the main site, every address
 * would "resolve" to whatever the main site answered.
 */
export function routeSubdomainRequest(
  hostHeader: string | null | undefined,
  pathname: string,
  apex: string | null
): SubdomainRoute {
  if (!apex) return { kind: 'main' };
  const host = hostname(hostHeader);
  if (host === apex || !host.endsWith(`.${apex}`)) return { kind: 'main' };

  const label = host.slice(0, -(apex.length + 1));
  if (MAIN_SITE_LABELS.has(label)) return { kind: 'main' };
  // a.b.homepageagain.com: not an address (and not on the certificate)
  if (!isValidLabel(label)) return { kind: 'not-found' };

  if (pathname === ATPROTO_DID_PATH || pathname === `${ATPROTO_DID_PATH}/`) return { kind: 'atproto-did', label };
  // Federation stays on the main site: no DID documents here (did.json,
  // users/*/did.json)
  if (pathname.startsWith('/.well-known/')) return { kind: 'not-found' };
  if (/^\/users\/[^/]+\/did\.json$/.test(pathname)) return { kind: 'not-found' };

  if (pathname === '/') return { kind: 'site', label };
  if (isStaticPath(pathname)) return { kind: 'pass', label };
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return isResidentApiRead(pathname) ? { kind: 'pass', label } : { kind: 'not-found' };
  }
  return { kind: 'main-site', label };
}

/**
 * A resident's address as a URL (https://alice.homepageagain.com/), for
 * links and canonical URLs. Null without one, or for a label the site may
 * need for itself (INFRA_LABELS).
 */
export function residentSiteUrl(
  label: string | null | undefined,
  apex = residentApex(),
  baseUrl = process.env.NEXT_PUBLIC_BASE_URL
): string | null {
  if (!label || !apex || !isValidLabel(label) || INFRA_LABELS.has(label) || MAIN_SITE_LABELS.has(label)) return null;
  let url: URL;
  try {
    url = new URL(baseUrl || 'http://localhost');
  } catch {
    return null;
  }
  url.hostname = `${label}.${apex}`;
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString();
}
