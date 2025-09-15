import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    try {
      const landingPages = await db.betaLandingPage.findMany({
        include: {
          creator: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              primaryHandle: true
            }
          },
          ender: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              primaryHandle: true
            }
          },
          _count: {
            select: {
              signups: true,
              attempts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ landingPages });
    } catch (error) {
      console.error("Error fetching beta landing pages:", error);
      return res.status(500).json({ error: "Failed to fetch beta landing pages" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, slug, title, description, content, signupLimit = 50 } = req.body;

      if (!name || !slug || !title) {
        return res.status(400).json({ error: "Name, slug, and title are required" });
      }

      // Validate slug format (alphanumeric, hyphens, underscores only)
      if (!/^[a-z0-9-_]+$/.test(slug)) {
        return res.status(400).json({
          error: "Slug must contain only lowercase letters, numbers, hyphens, and underscores"
        });
      }

      // Check if slug already exists
      const existingPage = await db.betaLandingPage.findUnique({
        where: { slug }
      });

      if (existingPage) {
        return res.status(400).json({ error: "A landing page with this slug already exists" });
      }

      const landingPage = await db.betaLandingPage.create({
        data: {
          name,
          slug,
          title,
          description,
          content,
          signupLimit: Math.max(1, signupLimit), // Ensure minimum of 1
          createdBy: adminUser.id
        },
        include: {
          creator: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              primaryHandle: true
            }
          }
        }
      });

      return res.json({ landingPage });
    } catch (error: any) {
      console.error("Error creating beta landing page:", error);
      if (error.code === "P2002") {
        return res.status(400).json({ error: "A landing page with this slug already exists" });
      }
      return res.status(500).json({ error: "Failed to create beta landing page" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}