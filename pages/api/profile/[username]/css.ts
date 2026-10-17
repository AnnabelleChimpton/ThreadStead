import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { cleanCss } from "@/lib/utils/sanitization/css";
import { snapshotProfileBeforeSave } from "@/lib/templates/revisions/template-revisions";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'template_editing' },
  async (req, res, { user: currentUser }) => {
    try {
      const username = String(req.query.username);
      const { customCSS, cssMode } = req.body;

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

      // Keep a restore point of what this save is about to overwrite
      const existing = handle.user.profile;
      const changesContent =
        (existing.customCSS || '') !== sanitizedCSS ||
        (cssMode !== undefined && existing.cssMode !== cssMode);
      if (changesContent) {
        await snapshotProfileBeforeSave(handle.user.id, 'css-save');
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
);
