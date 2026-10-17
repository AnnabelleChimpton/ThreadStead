import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

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
  welcome_dialog_title: "Welcome to ThreadStead",
  guestbook_prompt: "Share a friendly thought or memory…",
  site_description: "A pixel house on a street of real people. Decorate the yard, keep your page behind the front door, sign your neighbors' guestbooks.",
  disable_default_home: "false",
  disable_default_landing: "false",
  default_profile_css: "",
  terms_simple: "By creating an account, you agree to use our platform respectfully and responsibly.",
  terms_full: "Full terms and conditions not yet configured.",
  privacy_simple: "We protect your privacy and use reasonable security measures to protect your information.",
  privacy_full: "Full privacy policy not yet configured.",
  site_custom_css: "",
  founders_note: "",
};

export default apiHandler(
  { methods: ["GET", "PUT"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
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
    }
  }
);
