import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from '@/lib/auth-server';
import { SITE_NAME } from "@/lib/site-config";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const username = String(req.query.username);
    const { customCSS } = req.body;

    // Get current user
    const currentUser = await getSessionUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Find the handle first
    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!handle || !handle.user?.profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (handle.user.id !== currentUser.id) {
      return res.status(403).json({ error: "Not authorized to edit this profile" });
    }

    // Update the CSS
    const updatedProfile = await db.profile.update({
      where: { id: handle.user.profile.id },
      data: { customCSS }
    });

    return res.status(200).json({ 
      success: true,
      customCSS: updatedProfile.customCSS 
    });
  } catch (error) {
    console.error("Error saving CSS:", error);
    return res.status(500).json({ error: "Failed to save CSS" });
  }
}