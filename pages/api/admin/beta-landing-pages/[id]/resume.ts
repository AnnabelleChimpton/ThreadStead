import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    const { id } = req.query;

    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid landing page ID" });
    }

    try {
      // Check if landing page exists
      const landingPage = await db.betaLandingPage.findUnique({
        where: { id }
      });

      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      if (landingPage.endedAt) {
        return res.status(400).json({ error: "Cannot resume an ended campaign" });
      }

      if (landingPage.limitReached) {
        return res.status(400).json({ error: "Cannot resume a campaign that has reached its limit. Increase the limit first." });
      }

      const updatedLandingPage = await db.betaLandingPage.update({
        where: { id },
        data: { isPaused: false },
        include: {
          creator: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              primaryHandle: true
            }
          }
        }
      });

      return res.json({
        landingPage: updatedLandingPage,
        message: "Campaign resumed successfully"
      });
    } catch (error) {
      console.error("Error resuming beta landing page:", error);
      return res.status(500).json({ error: "Failed to resume campaign" });
    }
  }
);
