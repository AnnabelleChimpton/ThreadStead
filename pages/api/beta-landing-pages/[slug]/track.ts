import { apiHandler } from "@/lib/api/handler";
import { getClientIp } from "@/lib/server/http/client-ip";
import { allowTrackCall, claimCampaignKey } from "@/lib/domain/beta/landing-keys";

/**
 * "Claim Beta Key" on a campaign landing page. Hands back this visitor's key
 * for the campaign (the same one on every call until it's used); see
 * lib/domain/beta/landing-keys.ts for the limits.
 */
export default apiHandler(
  // no CSRF today: anonymous visitors, pages/beta/[slug].tsx POSTs with plain fetch
  { methods: ["POST"], auth: "none", csrf: false },
  async (req, res) => {
    const { slug } = req.query;

    if (typeof slug !== "string") {
      return res.status(400).json({ error: "Invalid landing page slug" });
    }

    // Keys are handed out one per IP, so a request we can't place gets none
    const ipAddress = getClientIp(req);
    if (!ipAddress) {
      return res.status(400).json({ error: "Couldn't start your signup. Try again in a moment." });
    }

    if (!allowTrackCall(ipAddress)) {
      return res.status(429).json({ error: "That's a lot of tries in a row. Wait a minute and try again." });
    }

    try {
      const result = await claimCampaignKey(slug, ipAddress, req.headers["user-agent"] || "");
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.json({
        signupId: result.signupId,
        betaKey: result.betaKey,
        message: "Signup tracking started"
      });
    } catch (error) {
      console.error("Error tracking beta landing page signup:", error);
      return res.status(500).json({ error: "Failed to track signup" });
    }
  }
);
