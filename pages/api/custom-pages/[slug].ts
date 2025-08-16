import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { slug } = req.query;
    
    if (typeof slug !== "string") {
      return res.status(400).json({ error: "Invalid slug" });
    }

    try {
      const page = await db.customPage.findFirst({
        where: { 
          slug,
          published: true 
        },
        select: {
          id: true,
          slug: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      res.json({ page });
    } catch (error) {
      console.error("Error fetching custom page:", error);
      res.status(500).json({ error: "Failed to fetch custom page" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}