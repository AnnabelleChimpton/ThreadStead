import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { DEFAULT_POLICIES } from "@/lib/config/site/policies";
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
  disable_default_landing: "false",
  default_profile_css: "",
  ...DEFAULT_POLICIES,
  site_custom_css: "",
  founders_note: "",
};

/**
 * Kept by their own routes and Admin sections: site CSS (site-css.ts), the
 * founder's note (founders-note.ts) and the policies (policies.ts). Saving
 * the site settings sent every key back as the page loaded them: with no
 * site CSS saved (the bundled theme), that wrote an empty one, which turns
 * the theme off, and it put back whatever note and policies the page had.
 * Listed in GET for whoever reads them, never written here.
 */
const OWN_ROUTE_KEYS = new Set(["site_custom_css", "founders_note", "terms_simple", "terms_full", "privacy_simple", "privacy_full"]);
const MAX_VALUE_LENGTH = 200_000;

export default apiHandler(
  { methods: ["GET", "PUT"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    if (req.method === "GET") {
      try {
        // The settings this route knows (other keys in the table are other features')
        const configs = await db.siteConfig.findMany({
          where: { key: { in: Object.keys(DEFAULT_CONFIG) } },
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

        if (providedKeys.some((key) => typeof config[key] !== "string" || config[key].length > MAX_VALUE_LENGTH)) {
          return res.status(400).json({ error: "Each setting is text, 200,000 characters at most." });
        }

        // Update or create each config value this route owns
        const updates = await Promise.all(
          providedKeys.filter((key) => !OWN_ROUTE_KEYS.has(key)).map(async (key) => {
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
    }
  }
);
