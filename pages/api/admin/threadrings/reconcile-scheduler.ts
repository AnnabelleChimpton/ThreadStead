import { threadRingReconciliationScheduler } from "@/lib/domain/threadrings/reconciliation-scheduler";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin" },
  async (req, res, { user: viewer }) => {
    try {
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
                result: result ? {
                  processed: result.processed,
                  corrected: result.corrected,
                  lineageErrors: result.lineageErrors,
                  timestamp: new Date().toISOString()
                } : {
                  processed: 0,
                  corrected: 0,
                  lineageErrors: 0,
                  timestamp: new Date().toISOString()
                }
              });

            default:
              return res.status(400).json({ error: "Invalid action. Use 'start', 'stop', or 'run'" });
          }
      }

    } catch (error) {
      console.error("Reconciliation scheduler API error:", error);
      return res.status(500).json({ 
        error: "Scheduler operation failed", 
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
