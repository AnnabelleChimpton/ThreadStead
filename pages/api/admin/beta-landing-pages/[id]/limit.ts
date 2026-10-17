import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["PUT"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    const { id } = req.query;
    const { signupLimit } = req.body;

    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid landing page ID" });
    }

    if (!signupLimit || signupLimit < 1) {
      return res.status(400).json({ error: "Signup limit must be at least 1" });
    }

    try {
      // Check if landing page exists
      const landingPage = await db.betaLandingPage.findUnique({
        where: { id }
      });

      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      // Get current signup count
      const currentSignupCount = await db.betaLandingSignup.count({
        where: {
          landingPageId: id,
          status: 'completed'
        }
      });

      // Calculate if limit is reached with new limit
      const limitReached = currentSignupCount >= signupLimit;

      const updatedLandingPage = await db.betaLandingPage.update({
        where: { id },
        data: {
          signupLimit: signupLimit,
          signupCount: currentSignupCount,
          limitReached: limitReached
        },
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
        message: `Signup limit updated to ${signupLimit}`,
        currentSignups: currentSignupCount
      });
    } catch (error) {
      console.error("Error updating signup limit:", error);
      return res.status(500).json({ error: "Failed to update signup limit" });
    }
  }
);
