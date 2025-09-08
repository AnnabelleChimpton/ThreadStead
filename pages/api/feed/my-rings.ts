import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { featureFlags } from "@/lib/feature-flags";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Check if RingHub is enabled
  if (!featureFlags.ringhub()) {
    return res.status(503).json({ 
      error: "Service unavailable", 
      message: "My Rings feed is not available" 
    });
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Must be logged in to view your rings feed"
      });
    }

    // Parse query parameters
    const {
      limit = "20",
      offset = "0", 
      since,
      until,
      includeNotifications = "true",
      ringId,
      sort = "newest"
    } = req.query;

    // Validate parameters
    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
    const sortValue = sort === "oldest" ? "oldest" : "newest";

    // Create authenticated RingHub client
    const authenticatedClient = createAuthenticatedRingHubClient(user.id);
    if (!authenticatedClient) {
      return res.status(503).json({ 
        error: "Service unavailable", 
        message: "Could not connect to RingHub service" 
      });
    }

    // Fetch feed from RingHub
    const feedResponse = await authenticatedClient.getMyFeed({
      limit: limitNum,
      offset: offsetNum,
      since: since ? String(since) : undefined,
      until: until ? String(until) : undefined,
      includeNotifications: includeNotifications === "true",
      ringId: ringId ? String(ringId) : undefined,
      sort: sortValue
    });

    return res.json(feedResponse);
    
  } catch (error: any) {
    console.error("My Rings feed error:", error);
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: "Authentication failed",
        message: "Could not authenticate with RingHub"
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json(error.data || {
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later."
      });
    }

    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to fetch your rings feed" 
    });
  }
}