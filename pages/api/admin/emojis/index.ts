import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";


// Admin emoji management API

export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user }) => {
    try {
      if (req.method === "GET") {
        // Get all emojis
        const emojis = await db.emoji.findMany({
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
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        return res.status(200).json({ emojis });
      }

      if (req.method === "POST") {
        // Create new emoji
        const { name, imageUrl } = req.body;

        if (!name || !imageUrl) {
          return res.status(400).json({ error: "Name and image URL are required" });
        }

        // Validate emoji name (alphanumeric, underscore, hyphen only)
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          return res.status(400).json({ error: "Emoji name can only contain letters, numbers, underscores, and hyphens" });
        }

        // Check if emoji name already exists
        const existingEmoji = await db.emoji.findUnique({
          where: { name }
        });

        if (existingEmoji) {
          return res.status(409).json({ error: "Emoji name already exists" });
        }

        const emoji = await db.emoji.create({
          data: {
            name,
            imageUrl,
            createdBy: user.id
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

        return res.status(201).json({ emoji });
      }
    } catch (error) {
      console.error("Admin emojis API error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
