import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid landing page ID" });
  }

  if (req.method === "GET") {
    try {
      const landingPage = await db.betaLandingPage.findUnique({
        where: { id },
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
        }
      });

      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      return res.json({ landingPage });
    } catch (error) {
      console.error("Error fetching beta landing page:", error);
      return res.status(500).json({ error: "Failed to fetch beta landing page" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { name, slug, title, description, content, signupLimit, isActive, isPaused } = req.body;

      if (!name || !slug || !title) {
        return res.status(400).json({ error: "Name, slug, and title are required" });
      }

      // Validate slug format
      if (!/^[a-z0-9-_]+$/.test(slug)) {
        return res.status(400).json({
          error: "Slug must contain only lowercase letters, numbers, hyphens, and underscores"
        });
      }

      // Check if slug is taken by another landing page
      const existingPage = await db.betaLandingPage.findFirst({
        where: {
          slug,
          NOT: { id }
        }
      });

      if (existingPage) {
        return res.status(400).json({ error: "A landing page with this slug already exists" });
      }

      // Calculate if limit is reached
      const currentSignupCount = await db.betaLandingSignup.count({
        where: {
          landingPageId: id,
          status: 'completed'
        }
      });

      const newSignupLimit = signupLimit !== undefined ? Math.max(1, signupLimit) : undefined;
      const limitReached = newSignupLimit !== undefined ? currentSignupCount >= newSignupLimit : undefined;

      const landingPage = await db.betaLandingPage.update({
        where: { id },
        data: {
          name,
          slug,
          title,
          description,
          content,
          ...(newSignupLimit !== undefined && { signupLimit: newSignupLimit }),
          ...(limitReached !== undefined && { limitReached }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(isPaused !== undefined && { isPaused: Boolean(isPaused) })
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
      console.error("Error updating beta landing page:", error);
      if (error.code === "P2002") {
        return res.status(400).json({ error: "A landing page with this slug already exists" });
      } else if (error.code === "P2025") {
        return res.status(404).json({ error: "Landing page not found" });
      } else {
        return res.status(500).json({ error: "Failed to update beta landing page" });
      }
    }
  }

  if (req.method === "DELETE") {
    try {
      await db.betaLandingPage.delete({
        where: { id }
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting beta landing page:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Landing page not found" });
      } else {
        return res.status(500).json({ error: "Failed to delete beta landing page" });
      }
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));