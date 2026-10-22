import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  {
    methods: ["GET", "POST"],
    auth: "user",
  },
  async (req, res, { user }) => {
    try {
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
      
    } catch (error) {
      console.error("Bio management error:", error);
      res.status(500).json({ 
        error: "Failed to manage bio. Please try again later." 
      });
    }
  }
);
