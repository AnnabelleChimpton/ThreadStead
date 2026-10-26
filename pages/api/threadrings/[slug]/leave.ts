import { apiHandler } from "@/lib/api/handler";
import { AuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";
import { leaveFailure } from "@/lib/rings/membership-errors";

/** Leave a ring, signed as the resident; a host with other members can't (the hub says so) */
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user: viewer }) => {
    const { slug } = req.query;
    if (typeof slug !== "string") {
      return res.status(400).json({ error: "Invalid slug" });
    }

    try {
      const authenticatedClient = new AuthenticatedRingHubClient(viewer.id);
      await authenticatedClient.leaveRing(slug);
      forgetRingReads(slug, [viewer.id]);

      return res.json({
        success: true,
        message: "You've left this ring.",
        role: null
      });
    } catch (ringHubError) {
      console.error("Ring Hub leave error:", ringHubError);
      const [status, error, extra] = leaveFailure(ringHubError);
      return res.status(status).json({ error, ...extra });
    }
  }
);
