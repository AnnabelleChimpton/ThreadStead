import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";




export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (_req, res) => {
    try {
      const pages = await db.customPage.findMany({
        where: { published: true },
        select: {
          id: true,
          slug: true,
          title: true,
          showInNav: true,
          navOrder: true,
          navDropdown: true,
        },
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
  }
);