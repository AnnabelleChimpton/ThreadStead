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
      // Check if landing page exists and is not ended
      const landingPage = await db.betaLandingPage.findUnique({
        where: { id }
      });

      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      if (landingPage.endedAt) {
        return res.status(400).json({ error: "Cannot pause an ended campaign" });
      }

      const updatedLandingPage = await db.betaLandingPage.update({
        where: { id },
        data: { isPaused: true },
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
        message: "Campaign paused."
      });
    } catch (error) {
      console.error("Error pausing beta landing page:", error);
      return res.status(500).json({ error: "Failed to pause campaign" });
    }
  }
);
