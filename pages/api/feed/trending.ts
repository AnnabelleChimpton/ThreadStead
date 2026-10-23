import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { apiHandler } from "@/lib/api/handler";
import { parseLimit } from "@/lib/server/http/pagination";
import { getHiddenIds, filterBlockedRingHubItems } from "@/lib/domain/users/blocks";

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    // Check if RingHub is enabled
    if (!featureFlags.ringhub()) {
      return res.status(503).json({ 
        error: "Service unavailable", 
        message: "Trending feed is not available" 
      });
    }

    try {
      // Parse query parameters
      const {
        timeWindow = "day",
        includeNotifications = "false"
      } = req.query;

      // Validate parameters
      const limitNum = parseLimit(req.query.limit, { fallback: 20, max: 50 });
      const timeWindowValue = ["hour", "day", "week"].includes(String(timeWindow)) 
        ? String(timeWindow) as "hour" | "day" | "week"
        : "day";

      // Create public RingHub client
      const publicClient = getPublicRingHubClient();
      if (!publicClient) {
        return res.status(503).json({ 
          error: "Service unavailable", 
          message: "Could not connect to RingHub service" 
        });
      }

      // Fetch trending feed from RingHub
      const feedResponse = await publicClient.getTrendingFeed({
        limit: limitNum,
        timeWindow: timeWindowValue,
        includeNotifications: includeNotifications === "true" ? true : undefined
      });

      // Nobody sees suspended or banned accounts' posts; signed-in viewers
      // also don't see people they blocked
      const { blockedUserIds } = await getHiddenIds(viewer?.id);
      return res.json({
        ...feedResponse,
        posts: await filterBlockedRingHubItems(feedResponse.posts ?? [], blockedUserIds),
      });
    
    } catch (error: any) {
      console.error("Trending feed error:", error);
      // Log full detail server-side only; never leak error.message/data to the client.
      console.error("Error details:", {
        status: error.status,
        message: error.message,
        data: error.data,
        stack: error.stack
      });

      if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
        return res.status(503).json({ error: 'hub_unavailable', degraded: true });
      }

      if (error.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later."
        });
      }

      // Generic message only — do not surface error.message/data to callers.
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch trending feed"
      });
    }
  }
);