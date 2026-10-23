import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { AuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(
  withCsrfProtection(
    async function handler(
      req: NextApiRequest,
      res: NextApiResponse
    ) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const authenticatedClient = new AuthenticatedRingHubClient(viewer.id);
      
      // Leave ring via Ring Hub
      await authenticatedClient.leaveRing(slug as string);
      forgetRingReads(slug, [viewer.id]);

      return res.json({
        success: true,
        message: "You've left this ring.",
        role: null
      });

    } catch (ringHubError: any) {
      console.error("Ring Hub leave error:", ringHubError);
      if (ringHubError.status === 404) {
        return res.status(404).json({ error: "ThreadRing not found" });
      }
      if (ringHubError.status === 400) {
        return res.status(400).json({ error: ringHubError.message || "Not a member of this ThreadRing" });
      }
      if (ringHubError.status === 403) {
        return res.status(403).json({ error: ringHubError.message || "Cannot leave ThreadRing" });
      }
      return res.status(500).json({ 
        error: "Failed to leave ThreadRing via Ring Hub", 
        details: ringHubError.message 
      });
    }

  } catch (error) {
    console.error("Error leaving ThreadRing:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
    }
  )
);