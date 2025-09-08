import { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

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

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Admin emoji API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}