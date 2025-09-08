import type { NextApiRequest, NextApiResponse } from "next";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
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
      message: "Trending feed is not available" 
    });
  }

  try {
    // Parse query parameters
    const {
      limit = "20",
      timeWindow = "day",
      includeNotifications = "true"
    } = req.query;

    // Validate parameters
    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
    const timeWindowValue = ["hour", "day", "week"].includes(String(timeWindow)) 
      ? String(timeWindow) as "hour" | "day" | "week"
      : "day";

    // Create public RingHub client
    const publicClient = getPublicRingHubClient();
    if (!publicClient) {
      return res.status(503).json({ 
        error: "Service unavailable", 
        message: "Could not connect to RingHub service" 
      });
    }

    // Fetch trending feed from RingHub
    const feedResponse = await publicClient.getTrendingFeed({
      limit: limitNum,
      timeWindow: timeWindowValue,
      includeNotifications: includeNotifications === "true" ? true : undefined
    });

    return res.json(feedResponse);
    
  } catch (error: any) {
    console.error("Trending feed error:", error);
    console.error("Error details:", {
      status: error.status,
      message: error.message,
      data: error.data,
      stack: error.stack
    });
    
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later."
      });
    }

    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message || "Failed to fetch trending feed",
      details: error.data || error.message
    });
  }
}