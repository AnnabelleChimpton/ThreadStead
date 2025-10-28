import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from '@/lib/auth/server';
import { SITE_NAME } from "@/lib/config/site/constants";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { cleanCss } from "@/lib/utils/sanitization/css";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const username = String(req.query.username);
    const { customCSS, cssMode } = req.body;

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

    // Validate cssMode if provided
    if (cssMode && !['inherit', 'override', 'disable'].includes(cssMode)) {
      return res.status(400).json({ error: "Invalid CSS mode. Must be 'inherit', 'override', or 'disable'" });
    }

    // Sanitize CSS to prevent XSS attacks
    const sanitizedCSS = cleanCss(customCSS || '');

    // Build update data object
    const updateData: { customCSS: string; cssMode?: string } = { customCSS: sanitizedCSS };
    if (cssMode !== undefined) {
      updateData.cssMode = cssMode;
    }

    // Update the CSS and optionally the CSS mode
    const updatedProfile = await db.profile.update({
      where: { id: handle.user.profile.id },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      customCSS: updatedProfile.customCSS,
      cssMode: updatedProfile.cssMode
    });
  } catch (error) {
    console.error("Error saving CSS:", error);
    return res.status(500).json({ error: "Failed to save CSS" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('template_editing')(withCsrfProtection(handler));