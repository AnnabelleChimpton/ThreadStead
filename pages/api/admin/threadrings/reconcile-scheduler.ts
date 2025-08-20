import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";
import { threadRingReconciliationScheduler } from "@/lib/threadring-reconciliation-scheduler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if user is authenticated and is an admin
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (viewer.role !== "admin") {
      return res.status(403).json({ error: "Admin privileges required" });
    }

    switch (req.method) {
      case "GET":
        // Get scheduler status
        const status = threadRingReconciliationScheduler.getStatus();
        return res.json({
          success: true,
          status: {
            schedulerRunning: status.running,
            reconciliationInProgress: status.reconciliationInProgress,
            timestamp: new Date().toISOString()
          }
        });

      case "POST":
        const { action, intervalHours } = req.body;

        switch (action) {
          case "start":
            const interval = parseInt(intervalHours) || 24;
            if (interval < 1 || interval > 168) { // 1 hour to 1 week
              return res.status(400).json({ error: "Interval must be between 1 and 168 hours" });
            }

            threadRingReconciliationScheduler.start(interval);
            console.log(`🔧 Admin ${viewer.primaryHandle} started ThreadRing reconciliation scheduler (${interval}h interval)`);
            
            return res.json({
              success: true,
              message: `Reconciliation scheduler started with ${interval}-hour interval`
            });

          case "stop":
            threadRingReconciliationScheduler.stop();
            console.log(`🔧 Admin ${viewer.primaryHandle} stopped ThreadRing reconciliation scheduler`);
            
            return res.json({
              success: true,
              message: "Reconciliation scheduler stopped"
            });

          case "run":
            console.log(`🔧 Admin ${viewer.primaryHandle} triggered manual ThreadRing reconciliation`);
            
            const result = await threadRingReconciliationScheduler.runReconciliation();
            
            return res.json({
              success: true,
              message: "Manual reconciliation completed",
              result: {
                processed: result.processed,
                corrected: result.corrected,
                lineageErrors: result.lineageErrors,
                timestamp: new Date().toISOString()
              }
            });

          default:
            return res.status(400).json({ error: "Invalid action. Use 'start', 'stop', or 'run'" });
        }

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Method Not Allowed" });
    }

  } catch (error) {
    console.error("Reconciliation scheduler API error:", error);
    return res.status(500).json({ 
      error: "Scheduler operation failed", 
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}