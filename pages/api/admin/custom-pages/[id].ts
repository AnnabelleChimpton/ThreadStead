import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";


import { requireAdmin } from "@/lib/auth/server";



async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.query;
  
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid page ID" });
  }

  if (req.method === "GET") {
    try {
      const page = await db.customPage.findUnique({
        where: { id }
      });
      
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      res.json({ page });
    } catch (error) {
      console.error("Error fetching custom page:", error);
      res.status(500).json({ error: "Failed to fetch custom page" });
    }
  } else if (req.method === "PUT") {
    try {
      const { slug, title, content, published, showInNav, navOrder, navDropdown, hideNavbar, isHomepage, isLandingPage } = req.body;
      
      if (!slug || !title) {
        return res.status(400).json({ error: "Slug and title are required" });
      }

      // Validate slug format (alphanumeric and hyphens only)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and hyphens" });
      }

      // If setting as homepage, unset any existing homepage (except this one)
      if (Boolean(isHomepage)) {
        await db.customPage.updateMany({
          where: {
            isHomepage: true,
            NOT: { id }
          },
          data: { isHomepage: false },
        });
      }

      // If setting as landing page, unset any existing landing page (except this one)
      if (Boolean(isLandingPage)) {
        await db.customPage.updateMany({
          where: {
            isLandingPage: true,
            NOT: { id }
          },
          data: { isLandingPage: false },
        });
      }

      const page = await db.customPage.update({
        where: { id },
        data: {
          slug,
          title,
          content: content || "",
          published: Boolean(published),
          showInNav: Boolean(showInNav),
          navOrder: Number(navOrder) || 0,
          navDropdown: navDropdown || null,
          hideNavbar: hideNavbar !== undefined ? Boolean(hideNavbar) : false,
          isHomepage: Boolean(isHomepage),
          isLandingPage: Boolean(isLandingPage),
        },
      });

      res.json({ page });
    } catch (error: any) {
      console.error("Error updating custom page:", error);
      if (error.code === "P2002") {
        res.status(400).json({ error: "A page with this slug already exists" });
      } else if (error.code === "P2025") {
        res.status(404).json({ error: "Page not found" });
      } else {
        res.status(500).json({ error: "Failed to update custom page" });
      }
    }
  } else if (req.method === "DELETE") {
    try {
      await db.customPage.delete({
        where: { id }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting custom page:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Page not found" });
      } else {
        res.status(500).json({ error: "Failed to delete custom page" });
      }
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
