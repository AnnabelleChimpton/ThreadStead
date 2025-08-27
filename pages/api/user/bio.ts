import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "POST") {
      // Update user's bio
      const { bio } = req.body as { bio?: string };
      
      if (typeof bio !== 'string') {
        return res.status(400).json({ error: "Bio must be a string" });
      }
      
      // Trim and limit bio length
      const sanitizedBio = bio.trim().slice(0, 1000);
      
      // Update or create profile with bio
      await db.profile.upsert({
        where: { userId: user.id },
        update: { bio: sanitizedBio },
        create: { userId: user.id, bio: sanitizedBio },
      });
      
      return res.json({ 
        success: true,
        message: "Bio updated successfully",
        bio: sanitizedBio
      });
    }
    
    if (req.method === "GET") {
      // Get user's current bio
      const profile = await db.profile.findUnique({
        where: { userId: user.id },
        select: { bio: true }
      });
      
      return res.json({
        bio: profile?.bio || ""
      });
    }
    
    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Bio management error:", error);
    res.status(500).json({ 
      error: "Failed to manage bio. Please try again later." 
    });
  }
}