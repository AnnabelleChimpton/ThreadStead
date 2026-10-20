import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";
import { sendUnauthenticated } from "@/lib/api/errors";
import { sendPrivateProfile } from "@/lib/domain/users/profile-access";
import { lookUpSource } from "@/lib/domain/profile/shared-source";

// Neocities-style view source.
// GET  -> the profile's template + CSS, readable by anyone who may see the
//         profile while the owner has sharing on (owners always see their own).
//         The rules live in lib/domain/profile/shared-source.ts.
// POST -> owner-only toggle: { enabled: boolean }
export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'optional', rateLimit: 'template_editing' },
  async (req, res, { user: currentUser }) => {
    try {
      const username = String(req.query.username);

      if (req.method === "GET") {
        const source = await lookUpSource(currentUser, username);
        if (source.status === "not_found") {
          return res.status(404).json({ error: "Profile not found" });
        }
        if (source.status === "hidden") {
          return sendPrivateProfile(res, source.visibility);
        }
        if (!source.sharing && !source.isOwner) {
          return res.status(403).json({ error: "This resident hasn't shared their source" });
        }

        return res.status(200).json({
          username,
          sharing: source.sharing,
          isOwner: source.isOwner,
          templateMode: source.templateMode,
          cssMode: source.cssMode,
          customTemplate: source.customTemplate,
          customCSS: source.customCSS,
        });
      }

      if (req.method === "POST") {
        if (!currentUser) {
          return sendUnauthenticated(res);
        }
        const handle = await db.handle.findFirst({
          where: { handle: username, host: SITE_NAME },
          include: { user: { include: { profile: true } } }
        });
        if (!handle || !handle.user.profile) {
          return res.status(404).json({ error: "Profile not found" });
        }
        const profile = handle.user.profile;
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
    } catch (error) {
      console.error("Error in view-source API:", error);
      return res.status(500).json({ error: "Failed to load source" });
    }
  }
);
