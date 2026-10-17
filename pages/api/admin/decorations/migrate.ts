import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

/**
 * Migration endpoint - BETA_ITEMS have been migrated to the database.
 * This endpoint now just reports the current state.
 *
 * Decorations are managed via /admin/decorations
 */
export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    try {
      // Report current state
      const decorationCount = await db.decorationItem.count();

      return res.status(200).json({
        message: `Migration already complete. Database contains ${decorationCount} decorations. Manage decorations via /admin/decorations.`,
        results: {
          created: 0,
          skipped: decorationCount,
          alreadyMigrated: true
        }
      });
    } catch (error) {
      console.error('Decoration migration error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
