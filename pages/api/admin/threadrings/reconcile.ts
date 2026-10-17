import { reconcileThreadRingCounters } from "@/scripts/reconcile-threadring-counters";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: viewer }) => {
    try {
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
);
