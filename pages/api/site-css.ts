import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";




const SITE_CSS_KEY = "site_custom_css";

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (_req, res) => {
    try {
      const config = await db.siteConfig.findUnique({
        where: { key: SITE_CSS_KEY }
      });

      res.json({ css: config?.value || "" });
    } catch (error) {
      console.error("Error fetching site CSS:", error);
      res.status(500).json({ error: "Failed to fetch site CSS" });
    }
  }
);