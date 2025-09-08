import type { NextApiRequest, NextApiResponse } from "next";
import { batchResolveDIDsToUsernames } from "@/lib/api/did/user-did-resolver";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { dids } = req.body;

    if (!Array.isArray(dids)) {
      return res.status(400).json({ error: "dids must be an array" });
    }

    if (dids.length === 0) {
      return res.json({ resolved: {} });
    }

    // Limit to reasonable number of DIDs
    if (dids.length > 100) {
      return res.status(400).json({ error: "Too many DIDs (max 100)" });
    }

    // Validate that all items are strings
    if (!dids.every(did => typeof did === 'string')) {
      return res.status(400).json({ error: "All DIDs must be strings" });
    }

    const resolvedMap = await batchResolveDIDsToUsernames(dids);
    
    // Convert Map to object for JSON response
    const resolved: Record<string, string> = {};
    resolvedMap.forEach((username, did) => {
      resolved[did] = username;
    });

    return res.json({ resolved });
    
  } catch (error) {
    console.error("Error resolving DIDs:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to resolve DIDs" 
    });
  }
}