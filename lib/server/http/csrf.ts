import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { sameOriginProtection } from "./same-origin";

/**
 * CSRF protection (double-submit cookie). The browser half is
 * lib/api/client/csrf-fetch.ts, which copies the cookie into the header.
 *
 * How it works:
 * 1. Generate a random CSRF token when user authenticates
 * 2. Set token in a cookie (csrfCookieName())
 * 3. Frontend includes token in request header (X-CSRF-Token)
 * 4. Validate that cookie value matches header value
 *
 * Since cookies are sent automatically but headers require JavaScript,
 * attackers cannot forge requests from external sites.
 */

/** The CSRF cookie's name before the `__Host-` prefix, still read in production for one session lifetime. */
export const LEGACY_CSRF_COOKIE = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32; // 256 bits

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Get the Secure cookie flag based on environment
 * In production: Returns "Secure; " for HTTPS-only cookies
 * In development: Returns "" to allow HTTP localhost
 */
export function getCookieSecureFlag(): string {
  return process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
}

/**
 * Whether the session and CSRF cookies take the `__Host-` prefix. Such a
 * cookie must be Secure with Path=/ and no Domain, so a subdomain
 * (alice.homepageagain.com) can neither set nor shadow it. Production only:
 * dev runs on plain http, where Secure cookies aren't kept everywhere
 * (127.0.0.1, Safari), so dev keeps the plain names.
 */
export function usesHostPrefixedCookies(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function csrfCookieName(): string {
  return usesHostPrefixedCookies() ? `__Host-${LEGACY_CSRF_COOKIE}` : LEGACY_CSRF_COOKIE;
}

/**
 * The value of cookie `name` in a Cookie header, or null. Anchored on a
 * cookie boundary, so `x_csrf_token` isn't read in place of `csrf_token`.
 * A malformed %-escape counts as missing.
 */
function cookieValue(cookie: string, name: string): string | null {
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Create the Set-Cookie header value for CSRF token
 */
export function createCsrfCookie(token: string, maxAge: number = 604800): string {
  // CSRF cookie is NOT HttpOnly - JavaScript needs to read it for the double-submit pattern
  // Session cookie remains HttpOnly for security (it contains actual secrets)
  // Secure flag is environment-dependent (HTTPS in production, HTTP in dev)
  // Max age: 7 days (same as session)
  return `${csrfCookieName()}=${token}; ${getCookieSecureFlag()}Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/**
 * Extract CSRF token from cookie. In production the old `csrf_token` name is
 * still read when there's no `__Host-` one: sessions from before the rename
 * carry only that. Drop the fallback a week after the rename ships (sessions
 * last 7 days and aren't extended).
 */
function getCsrfTokenFromCookie(req: Pick<NextApiRequest, "headers">): string | null {
  const cookie = req.headers.cookie || "";
  const current = cookieValue(cookie, csrfCookieName());
  if (current || !usesHostPrefixedCookies()) return current;
  return cookieValue(cookie, LEGACY_CSRF_COOKIE);
}

/**
 * Extract CSRF token from request header
 */
function getCsrfTokenFromHeader(req: NextApiRequest): string | null {
  const header = req.headers[CSRF_HEADER_NAME];
  if (typeof header === 'string') {
    return header;
  }
  if (Array.isArray(header) && header.length > 0) {
    return header[0];
  }
  return null;
}

/**
 * Validate CSRF token
 * Returns true if valid, false if invalid
 */
export function validateCsrfToken(req: NextApiRequest): boolean {
  // Skip validation for safe methods
  const method = req.method?.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const cookieToken = getCsrfTokenFromCookie(req);
  const headerToken = getCsrfTokenFromHeader(req);

  // Both must be present
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken, 'utf-8'),
      Buffer.from(headerToken, 'utf-8')
    );
  } catch {
    // Different lengths or invalid format
    return false;
  }
}

/**
 * Middleware to enforce CSRF protection
 */
export async function csrfProtection(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> {
  if (!validateCsrfToken(req)) {
    res.status(403).json({
      error: "CSRF token validation failed",
      message: "Invalid or missing CSRF token. Please refresh the page and try again."
    });
    return false;
  }
  return true;
}

/**
 * Get the CSRF token from request (for debugging/logging)
 */
export function getCsrfToken(req: Pick<NextApiRequest, "headers">): string | null {
  return getCsrfTokenFromCookie(req);
}

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;

/**
 * Wrap a hand-written route with the same-origin check and CSRF protection.
 * Routes on apiHandler get both from it instead.
 *
 *   export default withRateLimit('posts')(withCsrfProtection(handler));
 */
export function withCsrfProtection(handler: Handler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // On failure the 403 has already been sent
    if (!sameOriginProtection(req, res)) return;
    if (!(await csrfProtection(req, res))) return;
    return handler(req, res);
  };
}
