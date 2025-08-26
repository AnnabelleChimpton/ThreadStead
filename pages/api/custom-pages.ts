import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
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
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}