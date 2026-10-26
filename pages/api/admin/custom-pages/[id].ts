import { db } from "@/lib/config/database/connection";
import { ZodError } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { customPageSchema, saveCustomPage } from "@/lib/domain/custom-pages/save";

export default apiHandler(
  { methods: ["GET", "PUT", "DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
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
        const parsed = customPageSchema.safeParse(req.body);
        if (!parsed.success) throw parsed.error;
        const body = parsed.data;
        // The other page's homepage/landing flag moves with the save, or not at all
        const page = await saveCustomPage(body, id);

        res.json({ page });
      } catch (error: any) {
        if (error instanceof ZodError) throw error;
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
    }
  }
);
