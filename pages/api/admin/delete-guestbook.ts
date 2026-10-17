import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    const { entryId } = req.body;
    if (!entryId) {
      return res.status(400).json({ error: "Entry ID is required" });
    }

    try {
      const entry = await db.guestbookEntry.findUnique({
        where: { id: entryId },
        include: {
          owner: {
            select: {
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      });

      if (!entry) {
        return res.status(404).json({ error: "Guestbook entry not found" });
      }

      await db.guestbookEntry.delete({
        where: { id: entryId },
      });

      res.json({ 
        success: true,
        deletedEntry: {
          id: entry.id,
          profileOwner: entry.owner.profile?.displayName || entry.owner.primaryHandle || "Unknown",
          message: entry.message.substring(0, 50) + (entry.message.length > 50 ? "..." : ""),
        },
      });
    } catch (error) {
      console.error("Error deleting guestbook entry:", error);
      res.status(500).json({ error: "Failed to delete guestbook entry" });
    }
  }
);