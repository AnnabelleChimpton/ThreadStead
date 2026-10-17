import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

const SITE_CSS_KEY = "site_custom_css";

export default apiHandler(
  { methods: ["GET", "PUT"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    if (req.method === "GET") {
      try {
        const config = await db.siteConfig.findUnique({
          where: { key: SITE_CSS_KEY }
        });

        res.json({ css: config?.value || "" });
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

        res.json({ 
          success: true, 
          css: config.value 
        });
      } catch (error) {
        console.error("Error updating site CSS:", error);
        res.status(500).json({ error: "Failed to update site CSS" });
      }
    }
  }
);
