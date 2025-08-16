import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SITE_CSS_KEY = "site_custom_css";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}