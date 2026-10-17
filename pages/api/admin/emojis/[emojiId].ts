import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";


export default apiHandler(
  { methods: ["PUT", "DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    try {
      const { emojiId } = req.query;

      if (typeof emojiId !== "string") {
        return res.status(400).json({ error: "Invalid emoji ID" });
      }

      if (req.method === "PUT") {
        // Update emoji
        const { name, imageUrl } = req.body;

        if (!name || !imageUrl) {
          return res.status(400).json({ error: "Name and image URL are required" });
        }

        // Validate emoji name
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          return res.status(400).json({ error: "Emoji name can only contain letters, numbers, underscores, and hyphens" });
        }

        // Check if emoji exists
        const existingEmoji = await db.emoji.findUnique({
          where: { id: emojiId }
        });

        if (!existingEmoji) {
          return res.status(404).json({ error: "Emoji not found" });
        }

        // Check if new name conflicts with another emoji
        if (name !== existingEmoji.name) {
          const nameConflict = await db.emoji.findUnique({
            where: { name }
          });

          if (nameConflict) {
            return res.status(409).json({ error: "Emoji name already exists" });
          }
        }

        const updatedEmoji = await db.emoji.update({
          where: { id: emojiId },
          data: {
            name,
            imageUrl
          },
          include: {
            creator: {
              select: {
                id: true,
                profile: {
                  select: {
                    displayName: true
                  }
                },
                handles: {
                  select: {
                    handle: true
                  },
                  take: 1
                }
              }
            }
          }
        });

        return res.status(200).json({ emoji: updatedEmoji });
      }

      if (req.method === "DELETE") {
        // Delete emoji
        const emoji = await db.emoji.findUnique({
          where: { id: emojiId }
        });

        if (!emoji) {
          return res.status(404).json({ error: "Emoji not found" });
        }

        await db.emoji.delete({
          where: { id: emojiId }
        });

        return res.status(200).json({ message: "Emoji deleted successfully" });
      }
    } catch (error) {
      console.error("Admin emoji API error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
