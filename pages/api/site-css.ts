import { apiHandler } from "@/lib/api/handler";
import { getSiteCSS } from "@/lib/utils/css/site-css-server";

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (_req, res) => {
    try {
      res.json({ css: await getSiteCSS() });
    } catch (error) {
      console.error("Error fetching site CSS:", error);
      res.status(500).json({ error: "Failed to fetch site CSS" });
    }
  }
);