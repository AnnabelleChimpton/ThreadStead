import { db } from "@/lib/config/database/connection";
import { ZodError } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { customPageSchema, saveCustomPage } from "@/lib/domain/custom-pages/save";

export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
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
        const parsed = customPageSchema.safeParse(req.body);
        if (!parsed.success) throw parsed.error;
        const body = parsed.data;
        // The other page's homepage/landing flag moves with the save, or not at all
        const page = await saveCustomPage(body);

        res.json({ page });
      } catch (error: any) {
        if (error instanceof ZodError) throw error;
        console.error("Error creating custom page:", error);
        if (error.code === "P2002") {
          res.status(400).json({ error: "A page with this slug already exists" });
        } else {
          res.status(500).json({ error: "Failed to create custom page" });
        }
      }
    }
  }
);
