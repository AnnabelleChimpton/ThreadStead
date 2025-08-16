import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-server";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      const { slug, title, content, published, showInNav, navOrder } = req.body;
      
      if (!slug || !title) {
        return res.status(400).json({ error: "Slug and title are required" });
      }

      // Validate slug format (alphanumeric and hyphens only)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and hyphens" });
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