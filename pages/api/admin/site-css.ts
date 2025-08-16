import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-server";

const db = new PrismaClient();

const SITE_CSS_KEY = "site_custom_css";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

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
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}