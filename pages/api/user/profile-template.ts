import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getDefaultProfileTemplate, ProfileTemplateType } from "@/lib/templates/default-profile-templates";
import { cleanCss } from "@/lib/utils/sanitization/css";
import { snapshotProfileBeforeSave } from "@/lib/templates/revisions/template-revisions";

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
        const look = none
          ? { customCSS, templateMode: 'default' as const }
          : { customCSS, templateEnabled: true, templateMode: 'enhanced' as const };

        // Whatever this replaces stays in the person's History
        await snapshotProfileBeforeSave(user.id, 'css-save');
        await db.profile.upsert({
          where: { userId: user.id },
          update: look,
          create: { userId: user.id, ...look },
        });

        return res.json({ success: true, template });
      }
      
      if (req.method === "GET") {
        // Get user's current template
        const profile = await db.profile.findUnique({
          where: { userId: user.id },
          select: { customCSS: true, templateEnabled: true }
        });
        
        return res.json({
          hasCustomCss: !!profile?.customCSS,
          templateEnabled: profile?.templateEnabled || false
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
