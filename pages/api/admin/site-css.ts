import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getDefaultSiteCSS, invalidateSiteCSSCache } from "@/lib/utils/css/site-css-server";

const SITE_CSS_KEY = "site_custom_css";

export default apiHandler(
  { methods: ["GET", "PUT", "DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    if (req.method === "GET") {
      try {
        const config = await db.siteConfig.findUnique({
          where: { key: SITE_CSS_KEY }
        });

        // No saved row yet: show the bundled default, since that is what's live
        res.json(config ? { css: config.value ?? "", isDefault: false } : { css: getDefaultSiteCSS(), isDefault: true });
      } catch (error) {
        console.error("Error fetching site CSS:", error);
        res.status(500).json({ error: "Failed to fetch site CSS" });
      }
    } else if (req.method === "PUT") {
      try {
        const { css } = req.body;

        if (typeof css !== "string") {
          return res.status(400).json({ error: "CSS must be a string" });
        }

        // Basic CSS validation - ensure no script tags or javascript
        const sanitizedCSS = css
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/expression\s*\(/gi, "");

        const config = await db.siteConfig.upsert({
          where: { key: SITE_CSS_KEY },
          update: { value: sanitizedCSS },
          create: { key: SITE_CSS_KEY, value: sanitizedCSS },
        });

        invalidateSiteCSSCache();
        res.json({
          success: true,
          css: config.value,
          isDefault: false
        });
      } catch (error) {
        console.error("Error updating site CSS:", error);
        res.status(500).json({ error: "Failed to update site CSS" });
      }
    } else if (req.method === "DELETE") {
      // Back to the bundled default theme. deleteMany so it's a no-op
      // (not a P2025) when there's no saved row.
      try {
        await db.siteConfig.deleteMany({ where: { key: SITE_CSS_KEY } });
        invalidateSiteCSSCache();
        res.json({ success: true, css: getDefaultSiteCSS(), isDefault: true });
      } catch (error) {
        console.error("Error resetting site CSS:", error);
        res.status(500).json({ error: "Failed to reset site CSS" });
      }
    }
  }
);
