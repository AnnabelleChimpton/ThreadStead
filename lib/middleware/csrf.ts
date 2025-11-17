import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

/**
 * CSRF Protection Middleware (Double-Submit Cookie Pattern)
 *
 * How it works:
 * 1. Generate a random CSRF token when user authenticates
 * 2. Set token in a cookie (csrf_token)
 * 3. Frontend includes token in request header (X-CSRF-Token)
 * 4. Validate that cookie value matches header value
 *
 * Since cookies are sent automatically but headers require JavaScript,
 * attackers cannot forge requests from external sites.
 */

const CSRF_COOKIE_NAME = "csrf_token";
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
 * Create the Set-Cookie header value for CSRF token
 */
export function createCsrfCookie(token: string, maxAge: number = 604800): string {
  // CSRF cookie is NOT HttpOnly - JavaScript needs to read it for the double-submit pattern
  // Session cookie remains HttpOnly for security (it contains actual secrets)
  // Secure flag is environment-dependent (HTTPS in production, HTTP in dev)
  // Max age: 7 days (same as session)
  return `${CSRF_COOKIE_NAME}=${token}; ${getCookieSecureFlag()}Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/**
 * Extract CSRF token from cookie
 */
function getCsrfTokenFromCookie(req: NextApiRequest): string | null {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
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
export function getCsrfToken(req: NextApiRequest): string | null {
  return getCsrfTokenFromCookie(req);
}
