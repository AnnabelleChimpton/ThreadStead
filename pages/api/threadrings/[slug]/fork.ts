import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  const { name, description, joinType, visibility } = req.body;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "ThreadRing name is required" });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({ error: "ThreadRing name must be 100 characters or less" });
  }

  if (!joinType || !["open", "invite", "closed"].includes(joinType)) {
    return res.status(400).json({ error: "Invalid join type" });
  }

  if (!visibility || !["public", "unlisted", "private"].includes(visibility)) {
    return res.status(400).json({ error: "Invalid visibility" });
  }

  try {
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Find the original ThreadRing to fork
    const originalRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true,
        description: true,
        visibility: true,
        curatorId: true
      }
    });

    if (!originalRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if the original ThreadRing is visible to the viewer
    if (originalRing.visibility === "private") {
      // Check if viewer is a member of the original ring
      const membership = await db.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: originalRing.id,
            userId: viewer.id
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: "Cannot fork a private ThreadRing you're not a member of" });
      }
    }

    // Generate a unique slug for the forked ring
    const baseSlug = name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    let finalSlug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (true) {
      const existing = await db.threadRing.findUnique({
        where: { slug: finalSlug }
      });
      
      if (!existing) break;
      
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
      
      if (counter > 100) {
        return res.status(400).json({ 
          error: "Unable to generate unique slug. Please choose a different name." 
        });
      }
    }

    // Create the forked ThreadRing
    const forkedRing = await db.$transaction(async (tx) => {
      // Create the new ThreadRing
      const ring = await tx.threadRing.create({
        data: {
          name: name.trim(),
          slug: finalSlug,
          description: description?.trim() || null,
          joinType,
          visibility,
          curatorId: viewer.id,
          uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${finalSlug}`,
          memberCount: 1, // Curator is automatically a member
        },
      });

      // Create the curator membership
      await tx.threadRingMember.create({
        data: {
          threadRingId: ring.id,
          userId: viewer.id,
          role: "curator",
        },
      });

      // Create the fork relationship
      await tx.threadRingFork.create({
        data: {
          parentId: originalRing.id,
          childId: ring.id,
          createdBy: viewer.id
        }
      });

      // Note: No notification created - forks should be discoverable through the ring's fork page
      // This keeps ThreadRing activity ambient rather than invasive

      return ring;
    });

    return res.json({
      success: true,
      threadRing: {
        id: forkedRing.id,
        name: forkedRing.name,
        slug: forkedRing.slug,
        description: forkedRing.description,
        joinType: forkedRing.joinType,
        visibility: forkedRing.visibility,
        uri: forkedRing.uri
      },
      message: `Successfully forked "${originalRing.name}" as "${forkedRing.name}"`
    });

  } catch (error) {
    console.error("Error forking ThreadRing:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}