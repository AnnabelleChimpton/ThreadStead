import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { requireAdmin } from "@/lib/auth/server";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    try {
      const pages = await db.customPage.findMany({
        orderBy: [
          { navOrder: "asc" },
          { createdAt: "desc" }
        ]
      });
      res.json({ pages });
    } catch (error) {
      console.error("Error fetching custom pages:", error);
      res.status(500).json({ error: "Failed to fetch custom pages" });
    }
  } else if (req.method === "POST") {
    try {
      const { slug, title, content, published, showInNav, navOrder, navDropdown, hideNavbar, isHomepage } = req.body;
      
      if (!slug || !title) {
        return res.status(400).json({ error: "Slug and title are required" });
      }

      // Validate slug format (alphanumeric and hyphens only)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and hyphens" });
      }

      // If setting as homepage, unset any existing homepage
      if (Boolean(isHomepage)) {
        await db.customPage.updateMany({
          where: { isHomepage: true },
          data: { isHomepage: false },
        });
      }

      const page = await db.customPage.create({
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
        },
      });

      res.json({ page });
    } catch (error: any) {
      console.error("Error creating custom page:", error);
      if (error.code === "P2002") {
        res.status(400).json({ error: "A page with this slug already exists" });
      } else {
        res.status(500).json({ error: "Failed to create custom page" });
      }
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}