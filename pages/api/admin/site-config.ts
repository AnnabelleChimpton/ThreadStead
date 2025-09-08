import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { requireAdmin } from "@/lib/auth/server";



// Default site configuration values
const DEFAULT_CONFIG = {
  site_name: "ThreadStead",
  site_tagline: "@ ThreadStead",
  user_status_text: "threadstead resident",
  welcome_message: "Welcome to ThreadStead",
  directory_title: "ThreadStead Directory",
  directory_empty_message: "No residents have joined ThreadStead yet. Be the first!",
  feed_empty_message: "Be the first to share something on ThreadStead!",
  footer_text: "ThreadStead",
  welcome_dialog_title: "🎉 Welcome to Retro Social!",
  guestbook_prompt: "Share a friendly thought or memory…",
  site_description: "A cozy corner of the internet for thoughtful conversations and creative expression.",
  disable_default_home: "false",
  default_profile_css: "",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    try {
      // Get all site config values
      const configs = await db.siteConfig.findMany({
        select: {
          key: true,
          value: true,
        },
      });

      // Convert to key-value object and merge with defaults
      const configObj = configs.reduce((acc, config) => {
        acc[config.key] = config.value;
        return acc;
      }, {} as Record<string, string>);

      // Merge with defaults for any missing values
      const fullConfig = { ...DEFAULT_CONFIG, ...configObj };

      res.json({ config: fullConfig });
    } catch (error) {
      console.error("Error fetching site config:", error);
      res.status(500).json({ error: "Failed to fetch site configuration" });
    }
  } else if (req.method === "PUT") {
    try {
      const { config } = req.body;
      
      if (!config || typeof config !== "object") {
        return res.status(400).json({ error: "Invalid configuration data" });
      }

      // Validate that all keys are expected
      const validKeys = Object.keys(DEFAULT_CONFIG);
      const providedKeys = Object.keys(config);
      const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));
      
      if (invalidKeys.length > 0) {
        return res.status(400).json({ 
          error: `Invalid configuration keys: ${invalidKeys.join(", ")}`,
          validKeys 
        });
      }

      // Update or create each config value
      const updates = await Promise.all(
        providedKeys.map(async (key) => {
          const value = String(config[key] || "").trim();
          
          return db.siteConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value },
            select: { key: true, value: true },
          });
        })
      );

      const updatedConfig = updates.reduce((acc, config) => {
        acc[config.key] = config.value;
        return acc;
      }, {} as Record<string, string>);

      // Merge with defaults for complete response
      const fullConfig = { ...DEFAULT_CONFIG, ...updatedConfig };

      res.json({ 
        success: true, 
        config: fullConfig,
        updated: updates.length 
      });
    } catch (error) {
      console.error("Error updating site config:", error);
      res.status(500).json({ error: "Failed to update site configuration" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}