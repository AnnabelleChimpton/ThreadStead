import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { createLandingPageSchema } from "@/lib/domain/beta/landing-requests";

export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: adminUser }) => {
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
      const { name, slug, title, description, content, signupLimit = 50 } = createLandingPageSchema.parse(req.body ?? {});
      try {

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
            signupLimit,
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
  }
);
