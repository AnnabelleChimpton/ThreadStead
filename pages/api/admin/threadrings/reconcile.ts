import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";
import { reconcileThreadRingCounters } from "@/scripts/reconcile-threadring-counters";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Check if user is authenticated and is an admin
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (viewer.role !== "admin") {
      return res.status(403).json({ error: "Admin privileges required" });
    }

    // Run the reconciliation
    console.log(`🔧 Admin ${viewer.primaryHandle} triggered ThreadRing reconciliation`);
    
    const result = await reconcileThreadRingCounters();

    return res.json({
      success: true,
      message: "ThreadRing counter reconciliation completed",
      result: {
        processed: result.processed,
        corrected: result.corrected,
        lineageErrors: result.lineageErrors,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Reconciliation API error:", error);
    return res.status(500).json({ 
      error: "Reconciliation failed", 
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}