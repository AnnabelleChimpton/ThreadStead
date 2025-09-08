import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/server";
import { getDefaultProfileTemplate, ProfileTemplateType } from "@/lib/templates/default-profile-templates";

const VALID_TEMPLATES: ProfileTemplateType[] = ['abstract-art', 'charcoal-nights', 'pixel-petals', 'retro-social', 'classic-linen'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "POST") {
      // Update user's profile template
      const { template } = req.body as { template?: string };
      
      if (typeof template !== 'string' || !VALID_TEMPLATES.includes(template as ProfileTemplateType)) {
        return res.status(400).json({ error: "Invalid template selected" });
      }
      
      // Get the template CSS content
      const templateContent = getDefaultProfileTemplate(template as ProfileTemplateType);
      
      // Update or create profile with template
      await db.profile.upsert({
        where: { userId: user.id },
        update: { 
          customCSS: templateContent,
          templateEnabled: true,
          templateMode: 'enhanced'  // Use standard layout with user's custom CSS
        },
        create: { 
          userId: user.id, 
          customCSS: templateContent,
          templateEnabled: true,
          templateMode: 'enhanced'  // Use standard layout with user's custom CSS
        },
      });
      
      return res.json({ 
        success: true,
        message: "Profile template updated successfully",
        template: template
      });
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
    
    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Profile template management error:", error);
    res.status(500).json({ 
      error: "Failed to manage profile template. Please try again later." 
    });
  }
}