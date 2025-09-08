import type { NextApiRequest, NextApiResponse } from "next";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const client = getRingHubClient();
    if (!client) {
      return res.status(503).json({ error: "Ring Hub client not configured" });
    }

    const stats = await client.getStats();
    
    console.log('Ring Hub stats API response:', stats);
    
    return res.json(stats);

  } catch (error) {
    console.error("Error fetching Ring Hub stats:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}