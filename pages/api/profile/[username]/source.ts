import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from '@/lib/auth/server';
import { SITE_NAME } from "@/lib/config/site/constants";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

// Neocities-style view source.
// GET  -> the profile's template + CSS, readable by ANYONE while the owner
//         has sharing on (owners always see their own).
// POST -> owner-only toggle: { enabled: boolean }
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const username = String(req.query.username);

    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: { user: { include: { profile: true } } }
    });
    if (!handle || !handle.user.profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    const profile = handle.user.profile;

    if (req.method === "GET") {
      const currentUser = await getSessionUser(req);
      const isOwner = currentUser?.id === handle.user.id;

      if (!profile.showTemplateSource && !isOwner) {
        return res.status(403).json({ error: "This resident hasn't shared their source" });
      }

      return res.status(200).json({
        username,
        sharing: profile.showTemplateSource,
        isOwner,
        templateMode: profile.templateMode,
        cssMode: profile.cssMode,
        customTemplate: profile.customTemplate || '',
        customCSS: profile.customCSS || '',
      });
    }

    if (req.method === "POST") {
      const currentUser = await getSessionUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (currentUser.id !== handle.user.id) {
        return res.status(403).json({ error: "You can only change sharing on your own profile" });
      }

      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be true or false" });
      }

      await db.profile.update({
        where: { id: profile.id },
        data: { showTemplateSource: enabled },
      });

      return res.status(200).json({ success: true, sharing: enabled });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in view-source API:", error);
    return res.status(500).json({ error: "Failed to load source" });
  }
}

export default withRateLimit('template_editing')(withCsrfProtection(handler));
