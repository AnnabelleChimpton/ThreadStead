import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { SITE_NAME } from "@/lib/site-config";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const username = String(req.query.username || "");
  const page = parseInt(String(req.query.page || "1"));
  const limit = parseInt(String(req.query.limit || "20"));
  
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  try {
    // Find the user by handle
    const handle = await db.handle.findFirst({
      where: { 
        handle: username, 
        host: SITE_NAME 
      },
      include: {
        user: true
      }
    });

    if (!handle) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get all media for this user
    const [media, totalCount] = await Promise.all([
      db.media.findMany({
        where: {
          userId: handle.user.id,
          visibility: "public" // Only show public media for now
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          caption: true,
          thumbnailUrl: true,
          mediumUrl: true,
          fullUrl: true,
          featured: true,
          featuredOrder: true,
          createdAt: true,
          visibility: true,
          width: true,
          height: true,
          fileSize: true
        }
      }),
      db.media.count({
        where: {
          userId: handle.user.id,
          visibility: "public"
        }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      media,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error("Error fetching media:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}