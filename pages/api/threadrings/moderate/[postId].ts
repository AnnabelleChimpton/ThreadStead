import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";
import { shouldUseRingHub } from "@/lib/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!shouldUseRingHub()) {
      return res.status(503).json({ error: "Ring Hub is not available" });
    }

    const { postId } = req.query;
    const { action, reason, metadata } = req.body;

    // Validate required fields
    if (!postId || typeof postId !== "string") {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    if (!action || !["accept", "reject", "pin", "unpin", "remove"].includes(action)) {
      return res.status(400).json({ 
        error: "Invalid action. Must be one of: accept, reject, pin, unpin, remove" 
      });
    }

    // Validate optional reason length
    if (reason && reason.length > 500) {
      return res.status(400).json({ 
        error: "Reason must be 500 characters or less" 
      });
    }

    // Create authenticated Ring Hub client for the user
    const ringHubClient = createAuthenticatedRingHubClient(user.id);

    try {
      // Perform the curation action via Ring Hub
      const result = await ringHubClient.curatePost(postId, action, {
        reason,
        metadata
      });

      return res.status(200).json({
        success: true,
        result
      });

    } catch (error: any) {
      console.error("Ring Hub curation error:", error);
      
      // Handle specific Ring Hub errors
      if (error.status === 404) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      if (error.status === 403) {
        return res.status(403).json({ error: "Insufficient permissions to moderate this post" });
      }
      
      if (error.status === 400) {
        return res.status(400).json({ 
          error: error.message || "Invalid moderation action" 
        });
      }

      // Generic server error
      return res.status(500).json({
        error: "Failed to curate post",
        message: error.message
      });
    }

  } catch (error) {
    console.error("Curation API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}