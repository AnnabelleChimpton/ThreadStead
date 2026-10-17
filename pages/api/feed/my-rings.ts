import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { apiHandler } from "@/lib/api/handler";
import { sendUnauthenticated } from "@/lib/api/errors";

export default apiHandler(
  // optional, not 'user': the RingHub-disabled 503 below must still win over the signed-out 401
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user }) => {
    // Check if RingHub is enabled
    if (!featureFlags.ringhub()) {
      return res.status(503).json({ 
        error: "Service unavailable", 
        message: "My Rings feed is not available" 
      });
    }

    try {
      if (!user) return sendUnauthenticated(res);

      // Parse query parameters
      const {
        limit = "20",
        offset = "0", 
        since,
        until,
        includeNotifications = "true",
        ringId,
        sort = "newest"
      } = req.query;

      // Validate parameters
      const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
      const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
      const sortValue = sort === "oldest" ? "oldest" : "newest";

      // Create authenticated RingHub client
      const authenticatedClient = createAuthenticatedRingHubClient(user.id);
      if (!authenticatedClient) {
        return res.status(503).json({ 
          error: "Service unavailable", 
          message: "Could not connect to RingHub service" 
        });
      }

      // Fetch feed from RingHub
      const feedResponse = await authenticatedClient.getMyFeed({
        limit: limitNum,
        offset: offsetNum,
        since: since ? String(since) : undefined,
        until: until ? String(until) : undefined,
        includeNotifications: includeNotifications === "true",
        ringId: ringId ? String(ringId) : undefined,
        sort: sortValue
      });

      return res.json(feedResponse);
    
    } catch (error: any) {
      console.error("My Rings feed error:", error);

      // Distinguish hub unavailability from a genuinely empty feed.
      if (error instanceof RingHubAuthError) {
        return res.status(401).json({
          error: "Authentication failed",
          message: "Could not authenticate with RingHub",
          degraded: true
        });
      }
      if (error instanceof RingHubUnavailableError) {
        return res.status(503).json({ error: 'hub_unavailable', degraded: true });
      }

      if (error.status === 401) {
        return res.status(401).json({
          error: "Authentication failed",
          message: "Could not authenticate with RingHub"
        });
      }

      if (error.status === 429) {
        return res.status(429).json(error.data || {
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later."
        });
      }

      return res.status(500).json({ 
        error: "Internal server error", 
        message: "Failed to fetch your rings feed" 
      });
    }
  }
);