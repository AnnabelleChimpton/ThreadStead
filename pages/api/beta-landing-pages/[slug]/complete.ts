import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getClientIp } from "@/lib/server/http/client-ip";

/**
 * Marks a campaign signup completed once its key has made an account. The
 * account is the signed-in user (signup.tsx calls this right after
 * /api/auth/verify set the session), and the signup's key must be the one
 * that account used. It used to trust `userId` from the body, so anyone
 * could complete any signup and fill a campaign without signing up.
 */
export default apiHandler(
  // no CSRF today: pages/signup.tsx POSTs with plain fetch. A forged call can
  // only complete the caller's own signup.
  { methods: ["POST"], auth: "user", csrf: false },
  async (req, res, { user }) => {
    const { slug } = req.query;
    const { signupId } = req.body ?? {};

    if (typeof slug !== "string") {
      return res.status(400).json({ error: "Invalid landing page slug" });
    }

    if (typeof signupId !== "string" || !signupId) {
      return res.status(400).json({ error: "Signup ID is required" });
    }

    try {
      const landingPage = await db.betaLandingPage.findUnique({
        where: { slug },
        select: {
          id: true,
          signupLimit: true
        }
      });

      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      const signup = await db.betaLandingSignup.findFirst({
        where: { id: signupId, landingPageId: landingPage.id }
      });
      const key = signup?.betaCode
        ? await db.betaKey.findUnique({ where: { key: signup.betaCode }, select: { usedBy: true } })
        : null;

      if (!signup || key?.usedBy !== user.id) {
        return res.status(404).json({ error: "Signup not found" });
      }

      if (signup.status !== "completed") {
        await db.betaLandingSignup.update({
          where: { id: signup.id },
          data: {
            userId: user.id,
            signupCompletedAt: new Date(),
            status: "completed"
          }
        });

        await db.signupAttempt.updateMany({
          where: {
            landingPageId: landingPage.id,
            betaCode: signup.betaCode,
            success: false
          },
          data: {
            success: true,
            userId: user.id
          }
        });

        const ipAddress = signup.ipAddress ?? getClientIp(req) ?? "unknown";
        await db.ipSignupTracking.updateMany({
          where: { ipAddress },
          data: {
            successfulSignups: { increment: 1 },
            lastAttemptAt: new Date()
          }
        });
      }

      const completedSignupsCount = await db.betaLandingSignup.count({
        where: {
          landingPageId: landingPage.id,
          status: "completed"
        }
      });

      const limitReached = completedSignupsCount >= landingPage.signupLimit;

      await db.betaLandingPage.update({
        where: { id: landingPage.id },
        data: {
          signupCount: completedSignupsCount,
          limitReached
        }
      });

      return res.json({
        totalSignups: completedSignupsCount,
        limitReached,
        message: "Signup completed"
      });
    } catch (error) {
      console.error("Error completing beta landing page signup:", error);
      return res.status(500).json({ error: "Failed to complete signup tracking" });
    }
  }
);
