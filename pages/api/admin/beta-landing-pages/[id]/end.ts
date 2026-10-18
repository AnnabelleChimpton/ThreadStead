import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: adminUser }) => {
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
        return res.status(400).json({ error: "Campaign is already ended" });
      }

      const updatedLandingPage = await db.betaLandingPage.update({
        where: { id },
        data: {
          endedAt: new Date(),
          endedBy: adminUser.id,
          isActive: false,
          isPaused: false
        },
        include: {
          creator: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              primaryHandle: true
            }
          },
          ender: {
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
        message: "Campaign ended."
      });
    } catch (error) {
      console.error("Error ending beta landing page:", error);
      return res.status(500).json({ error: "Failed to end campaign" });
    }
  }
);
