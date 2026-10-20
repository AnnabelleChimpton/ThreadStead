import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getDefaultProfileTemplate, ProfileTemplateType } from "@/lib/templates/default-profile-templates";
import { cleanCss } from "@/lib/utils/sanitization/css";
import { snapshotProfileBeforeSave } from "@/lib/templates/revisions/template-revisions";
import { layoutFields, layoutOf } from "@/lib/domain/profile/layout";
import { PAGE_LOOK_SELECT, changesPageLook, pageUpdatedNow } from "@/lib/domain/profile/page-updates";

const VALID_TEMPLATES: ProfileTemplateType[] = ['abstract-art', 'charcoal-nights', 'pixel-petals', 'retro-social', 'classic-linen'];

export default apiHandler(
  {
    methods: ["GET", "POST"],
    auth: "user",
    // no CSRF today: signup.tsx posts with plain fetch
    csrf: false,
  },
  async (req, res, { user }) => {
    try {
      if (req.method === "POST") {
        // Put a theme on the profile (signup, Settings > Your page), or
        // "none" for the site's own look. Either way the standard layout.
        const { template } = req.body as { template?: string };
        const none = template === 'none';

        if (typeof template !== 'string' || (!none && !VALID_TEMPLATES.includes(template as ProfileTemplateType))) {
          return res.status(400).json({ error: "Invalid template selected" });
        }

        // Our own presets, but saved through the same sanitizer as everyone's CSS
        const customCSS = none ? '' : cleanCss(getDefaultProfileTemplate(template as ProfileTemplateType));
        const look = { customCSS, ...layoutFields({ layout: 'standard' }) };

        // A theme is the person updating their page (when it changes anything)
        const before = await db.profile.findUnique({ where: { userId: user.id }, select: PAGE_LOOK_SELECT });
        const write = { ...look, ...(changesPageLook(before, look) && pageUpdatedNow()) };

        // Whatever this replaces stays in the person's History
        await snapshotProfileBeforeSave(user.id, 'css-save');
        await db.profile.upsert({
          where: { userId: user.id },
          update: write,
          create: { userId: user.id, ...write },
        });

        return res.json({ success: true, template });
      }
      
      if (req.method === "GET") {
        // Whether the page has a look of its own yet: some CSS (signup's
        // theme step always saves some), or a page of their own HTML
        const profile = await db.profile.findUnique({
          where: { userId: user.id },
          select: { customCSS: true, templateMode: true }
        });

        return res.json({
          hasCustomCss: !!profile?.customCSS?.trim(),
          layout: layoutOf(profile?.templateMode),
        });
      }
      
    } catch (error) {
      console.error("Profile template management error:", error);
      res.status(500).json({ 
        error: "Failed to manage profile template. Please try again later." 
      });
    }
  }
);
