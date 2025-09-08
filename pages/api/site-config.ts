import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";




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
  enable_intent_stamps: "true",
  require_post_titles: "true",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json({ config: fullConfig });
  } catch (error) {
    console.error("Error fetching site config:", error);
    res.status(500).json({ error: "Failed to fetch site configuration" });
  }
}