import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { generateCsrfToken, createCsrfCookie } from "@/lib/middleware/csrf";

/**
 * CSRF Token Auto-Generation Endpoint
 *
 * Generates a CSRF token for authenticated users who don't have one yet.
 * This handles the migration case where existing users logged in before
 * CSRF protection was implemented.
 *
 * Security: Only generates tokens for users with valid sessions.
 * The double-submit cookie pattern still prevents CSRF attacks because
 * attackers cannot read the cookie value from external sites.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests (token generation is idempotent)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Check if user has valid session
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({
      error: "Not authenticated",
      message: "Please log in to get a CSRF token"
    });
  }

  // Check if user already has a CSRF token
  const cookie = req.headers.cookie || "";
  const existingToken = cookie.match(/csrf_token=([^;]+)/);

  if (existingToken) {
    // User already has a token, nothing to do
    return res.status(200).json({
      success: true,
      hasToken: true,
      message: "CSRF token already exists"
    });
  }

  // Generate new CSRF token for this authenticated user
  const csrfToken = generateCsrfToken();

  // Set CSRF cookie (7 day expiry, matches session duration)
  res.setHeader("Set-Cookie", createCsrfCookie(csrfToken, 604800));

  return res.status(200).json({
    success: true,
    hasToken: false,
    generated: true,
    message: "CSRF token generated successfully"
  });
}
