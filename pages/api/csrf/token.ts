import { apiHandler } from "@/lib/api/handler";
import { generateCsrfToken, createCsrfCookie } from "@/lib/server/http/csrf";

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
export default apiHandler(
  { methods: ["GET"], auth: "user" },
  async (req, res) => {
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
);
