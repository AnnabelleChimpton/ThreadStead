import { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";

// Admin emoji management API

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

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

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Admin emojis API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}