import type { NextApiRequest, NextApiResponse } from "next";
import { getSiteBaseUrl } from "@/lib/config/site-url";

/**
 * Cross-origin protection for state-changing requests, independent of the
 * CSRF token. It matters because a resident subdomain (alice.homepageagain.com)
 * is *same-site* with the main site: SameSite=Strict cookies still go along
 * with a form it submits, but the browser marks the request as not
 * same-origin, and that is what this checks.
 *
 * The rule (the same one as Go's net/http CrossOriginProtection):
 *   1. Sec-Fetch-Site present: allow only `same-origin` or `none` (the user
 *      typed or bookmarked it). `same-site` and `cross-site` are refused.
 *   2. Otherwise Origin present: allow only the site's own origin.
 *   3. Neither header: allow. Every browser that can carry a visitor's
 *      cookies sends at least one of them on a POST, so this is a script or
 *      server caller, which CSRF can't come from.
 * GET, HEAD and OPTIONS are always allowed.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function header(req: Pick<NextApiRequest, "headers">, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** The site's origin (scheme://host[:port]), from NEXT_PUBLIC_BASE_URL. */
export function getSiteOrigin(): string {
  return new URL(getSiteBaseUrl()).origin;
}

/** Whether a request's headers say it came from the site's own pages. */
export function isSameOriginRequest(req: Pick<NextApiRequest, "headers">): boolean {
  const fetchSite = header(req, "sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" || fetchSite === "none";

  const origin = header(req, "origin");
  if (origin) return origin === getSiteOrigin();

  return true;
}

export const CROSS_ORIGIN_ERROR = "Requests from other sites aren't allowed here.";

/**
 * Refuse a cross-origin POST/PUT/PATCH/DELETE with a 403. Returns false when
 * it has answered. apiHandler runs this on every route, whatever its `csrf`
 * option; hand-written routes get it from withCsrfProtection or call it.
 */
export function sameOriginProtection(req: NextApiRequest, res: NextApiResponse): boolean {
  if (SAFE_METHODS.has((req.method ?? "GET").toUpperCase())) return true;
  if (isSameOriginRequest(req)) return true;
  res.status(403).json({ error: CROSS_ORIGIN_ERROR });
  return false;
}
