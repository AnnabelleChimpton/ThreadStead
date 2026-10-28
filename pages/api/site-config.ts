import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { SITE_TITLE } from "@/lib/config/site/constants";




// Default site configuration values
const DEFAULT_CONFIG = {
  site_name: SITE_TITLE,
  site_tagline: "",
  user_status_text: "resident",
  welcome_message: `Welcome to ${SITE_TITLE}`,
  directory_title: `${SITE_TITLE} Directory`,
  directory_empty_message: `No residents have joined ${SITE_TITLE} yet. Be the first!`,
  feed_empty_message: `Be the first to share something on ${SITE_TITLE}!`,
  footer_text: SITE_TITLE,
  welcome_dialog_title: `Welcome to ${SITE_TITLE}`,
  guestbook_prompt: "Share a friendly thought or memory…",
  site_description: "A pixel house on a street of real people. Decorate the yard, keep your page behind the front door, sign your neighbors' guestbooks.",
  disable_default_home: "false",
  default_profile_css: "",
  enable_intent_stamps: "true",
  require_post_titles: "true",
};

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (_req, res) => {
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
);