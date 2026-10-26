import { apiHandler } from "@/lib/api/handler";
import { AuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { retryWithBackoff } from "@/lib/api/ringhub/ringhub-retry";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";
import { joinFailure } from "@/lib/rings/membership-errors";

/**
 * Join a ring, signed as the resident: the hub decides (open, invite-only,
 * closed, or someone it removed) and owns the membership.
 */
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user: viewer }) => {
    const { slug } = req.query;
    if (typeof slug !== "string") {
      return res.status(400).json({ error: "Invalid slug" });
    }

    try {
      const authenticatedClient = new AuthenticatedRingHubClient(viewer.id);

      // Retried: the hub registers a first-time actor on its first request,
      // and the join itself can need a second try.
      const joinResult = await retryWithBackoff(
        () => authenticatedClient.joinRing(slug),
        {
          maxRetries: 3,
          baseDelay: 500, // 500ms, 1s, 2s exponential backoff
        }
      );
      // So the page, the directory and the composer see the new member now
      forgetRingReads(slug, [viewer.id]);

      return res.json({
        success: true,
        message: "You're in.",
        role: "member",
        // The hub nests the badge: { membership, badge: { id, url } | null }.
        // The old membership.badgeId read was always undefined on the wire.
        badgeId: joinResult.badge?.id
      });
    } catch (ringHubError) {
      console.error("Ring Hub join error:", ringHubError);
      const [status, error, extra] = joinFailure(ringHubError);
      return res.status(status).json({ error, ...extra });
    }
  }
);
