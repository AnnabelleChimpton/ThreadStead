import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync } from "fs";
import path from "path";
import { db } from "@/lib/config/database/connection";

const SITE_CSS_KEY = "site_custom_css";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Check if site CSS should be included
      const includeSiteCSS = req.query.includeSiteCSS !== 'false';
      
      // Read the base stylesheets
      const globalsPath = path.join(process.cwd(), 'styles', 'globals.css');
      const retroPath = path.join(process.cwd(), 'styles', 'retro.css');
      
      const globalsCSS = readFileSync(globalsPath, 'utf8');
      const retroCSS = readFileSync(retroPath, 'utf8');
      
      // Get site-wide custom CSS from database only if requested
      let siteCustomCSS = "";
      if (includeSiteCSS) {
        const config = await db.siteConfig.findUnique({
          where: { key: SITE_CSS_KEY }
        });
        siteCustomCSS = config?.value || "";
      }

      // Combine all stylesheets in the correct order
      const stylesheetParts = [
        "/* ThreadStead Base Styles - globals.css */",
        globalsCSS,
        "",
        "/* ThreadStead Retro Design System - retro.css */", 
        retroCSS
      ];
      
      if (includeSiteCSS && siteCustomCSS) {
        stylesheetParts.push(
          "",
          "/* Site-wide Custom CSS */",
          siteCustomCSS
        );
      }
      
      const completeStylesheet = stylesheetParts.join('\n');

      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.send(completeStylesheet);
    } catch (error) {
      console.error("Error generating site stylesheet:", error);
      res.status(500).json({ error: "Failed to generate site stylesheet" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}