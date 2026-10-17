import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (_req, res) => {
    try {
      // Get all emojis (public endpoint for use in comments and posts)
      const emojis = await db.emoji.findMany({
        select: {
          id: true,
          name: true,
          imageUrl: true
        },
        orderBy: {
          name: "asc"
        }
      });

      return res.status(200).json({ emojis });
    } catch (error) {
      console.error("Emojis API error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);