import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { SITE_NAME } from "@/lib/site-config";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const username = String(req.query.username || "");
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

    // Get featured media for this user
    const featuredMedia = await db.media.findMany({
      where: {
        userId: handle.user.id,
        featured: true,
        visibility: "public" // Only show public media for now
      },
      orderBy: {
        featuredOrder: "asc"
      },
      take: 6, // Maximum 6 featured items
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
        visibility: true
      }
    });

    return res.status(200).json({
      media: featuredMedia,
      count: featuredMedia.length
    });

  } catch (error) {
    console.error("Error fetching featured media:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}