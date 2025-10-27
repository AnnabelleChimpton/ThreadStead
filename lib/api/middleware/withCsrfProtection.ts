import type { NextApiRequest, NextApiResponse } from "next";
import { csrfProtection } from "@/lib/middleware/csrf";

/**
 * Higher-order function to wrap API handlers with CSRF protection
 *
 * Usage:
 *   async function handler(req: NextApiRequest, res: NextApiResponse) {
 *     // Your handler logic
 *   }
 *   export default withCsrfProtection(handler);
 *
 * Or with other middleware:
 *   export default withRateLimit('posts')(withCsrfProtection(handler));
 */
export function withCsrfProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Validate CSRF token
    const isValid = await csrfProtection(req, res);

    // If validation failed, response is already sent
    if (!isValid) {
      return;
    }

    // Proceed to handler
    return handler(req, res);
  };
}
