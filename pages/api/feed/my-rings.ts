import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { apiHandler } from "@/lib/api/handler";
import { sendUnauthenticated } from "@/lib/api/errors";
import { parseOffsetPagination } from "@/lib/server/http/pagination";
import { getHiddenIds, filterBlockedRingHubItems } from "@/lib/domain/users/blocks";
import { visibleRingHubItems } from "@/lib/domain/posts/visibility";

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user }) => {
    try {
      if (!user) return sendUnauthenticated(res);

      // Parse query parameters
      const {
        since,
        until,
        ringId,
        sort = "newest"
      } = req.query;

      // Validate parameters
      const { limit: limitNum, offset: offsetNum } = parseOffsetPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
      const sortValue = sort === "oldest" ? "oldest" : "newest";

      // Create authenticated RingHub client
      const authenticatedClient = createAuthenticatedRingHubClient(user.id);

      // Fetch feed from RingHub. Fork notices are dropped below, not with the
      // hub's includeNotifications=false: its JSON-path `not` filter may also
      // drop posts whose metadata has no `type` (unverified on prod).
      const feedResponse = await authenticatedClient.getMyFeed({
        limit: limitNum,
        offset: offsetNum,
        since: since ? String(since) : undefined,
        until: until ? String(until) : undefined,
        ringId: ringId ? String(ringId) : undefined,
        sort: sortValue
      });

      // Leave out fork notices, and posts and activity from people the viewer
      // blocked. Paging follows the hub's items, so the next page starts at
      // nextOffset.
      const { blockedUserIds } = await getHiddenIds(user.id);
      const posts = await visibleRingHubItems(
        await filterBlockedRingHubItems((feedResponse.posts ?? []).filter((post) => !post.isNotification), blockedUserIds),
        user.id
      );

      return res.json({
        ...feedResponse,
        posts,
        nextOffset: offsetNum + (feedResponse.posts?.length ?? 0),
      });
    
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