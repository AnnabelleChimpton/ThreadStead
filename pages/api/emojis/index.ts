import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

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