import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { landingLimitSchema } from "@/lib/domain/beta/landing-requests";

export default apiHandler(
  { methods: ["PUT"], auth: "admin", rateLimit: "admin", schema: landingLimitSchema },
  async (req, res, { body }) => {
    const { id } = req.query;
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid landing page ID" });
    }
    const { signupLimit } = body;

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
        message: `Signup limit set to ${signupLimit}.`,
        currentSignups: currentSignupCount
      });
    } catch (error) {
      console.error("Error updating signup limit:", error);
      return res.status(500).json({ error: "Failed to update signup limit" });
    }
  }
);
