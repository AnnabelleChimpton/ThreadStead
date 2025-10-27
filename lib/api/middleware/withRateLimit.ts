import type { NextApiRequest, NextApiResponse } from "next";
import { rateLimitCheck, type RateLimitCategory } from "@/lib/middleware/generalRateLimiting";
import { getSessionUser } from "@/lib/auth/server";

/**
 * Higher-order function to wrap API handlers with rate limiting
 *
 * Usage:
 *   async function handler(req: NextApiRequest, res: NextApiResponse) {
 *     // Your handler logic
 *   }
 *   export default withRateLimit('posts')(handler);
 *
 * Or with CSRF protection:
 *   export default withRateLimit('posts')(withCsrfProtection(handler));
 */
export function withRateLimit(category: RateLimitCategory) {
  return (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>
  ) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Get user ID if authenticated (for user-based rate limiting)
      const user = await getSessionUser(req);
      const userId = user?.id;

      // Check rate limit
      const allowed = await rateLimitCheck(req, res, category, userId);

      // If rate limited, response is already sent
      if (!allowed) {
        return;
      }

      // Proceed to handler
      return handler(req, res);
    };
  };
}
