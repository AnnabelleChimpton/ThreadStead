/**
 * Residents' addresses: alice.homepageagain.com
 * (design/home-subdomains/SCOPE.md). Phase 1 serves only
 * /.well-known/atproto-did there, so the address works as a Bluesky handle;
 * every other path goes to the resident's profile on the main site.
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

export type SubdomainRoute =
  /** Not a resident's host: the main site carries on as usual */
  | { kind: 'main' }
  /** The Bluesky handle check. Never redirected. */
  | { kind: 'atproto-did'; label: string }
  /** Federation paths, API paths and malformed hosts */
  | { kind: 'not-found' }
  /** Anything else on a resident's host: off to their profile */
  | { kind: 'resident'; label: string };

function hostname(hostHeader: string | null | undefined): string {
  let host = (hostHeader ?? '').trim().toLowerCase();
  if (host.startsWith('[')) return host; // IPv6 literal
  host = host.replace(/:\d+$/, '');
  return host.endsWith('.') ? host.slice(0, -1) : host;
}

/**
 * Where a request goes, from its Host header and path. The atproto path is
 * checked before anything that redirects: Bluesky's resolver follows
 * redirects, so if this path ever ended up on the main site, every
 * address would "resolve" to whatever the main site answered.
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
  // users/*/did.json) and no API.
  if (pathname.startsWith('/.well-known/') || pathname.startsWith('/api/') || pathname === '/api') {
    return { kind: 'not-found' };
  }
  if (/^\/users\/[^/]+\/did\.json$/.test(pathname)) return { kind: 'not-found' };
  return { kind: 'resident', label };
}
