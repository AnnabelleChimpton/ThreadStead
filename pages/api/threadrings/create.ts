import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

// Temporarily use string literals instead of Prisma types
type ThreadRingJoinType = "open" | "invite" | "closed";
type ThreadRingVisibility = "public" | "unlisted" | "private";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("ThreadRing create API called");
    
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    console.log("Getting session user...");
    const viewer = await getSessionUser(req);
    if (!viewer) return res.status(401).json({ error: "not logged in" });
    
    console.log("User found:", viewer.id);

  const { name, slug, description, joinType, visibility } = (req.body || {}) as {
    name?: string;
    slug?: string;
    description?: string;
    joinType?: ThreadRingJoinType;
    visibility?: ThreadRingVisibility;
  };

  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  // Generate or validate slug
  let finalSlug = slug?.trim() || slugify(name.trim());
  if (!finalSlug) {
    return res.status(400).json({ error: "Invalid name for slug generation" });
  }

  // Check if slug is already taken
  const existingRing = await db.threadRing.findUnique({
    where: { slug: finalSlug }
  });

  if (existingRing) {
    return res.status(400).json({ error: "A ThreadRing with this name already exists" });
  }

  const validJoinType: ThreadRingJoinType = 
    joinType && ["open", "invite", "closed"].includes(joinType) ? joinType : "open";
  
  const validVisibility: ThreadRingVisibility = 
    visibility && ["public", "unlisted", "private"].includes(visibility) ? visibility : "public";

    try {
      console.log("Creating ThreadRing with data:", {
        name: name.trim(),
        slug: finalSlug,
        joinType: validJoinType,
        visibility: validVisibility
      });
      
      // Create the ThreadRing with URI for federation
      const ring = await db.threadRing.create({
        data: {
          name: name.trim(),
          slug: finalSlug,
          description: description?.trim() || null,
          joinType: validJoinType as any, // Cast to avoid type issues
          visibility: validVisibility as any, // Cast to avoid type issues
          curatorId: viewer.id,
          uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${finalSlug}`,
          memberCount: 1, // Curator is automatically a member
        },
      });

      console.log("ThreadRing created:", ring.id);

      // Add the creator as a curator member
      await db.threadRingMember.create({
        data: {
          threadRingId: ring.id,
          userId: viewer.id,
          role: "curator" as any, // Cast to avoid type issues
        },
      });

      console.log("Curator member added");
      res.status(201).json({ ring });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      res.status(500).json({ error: "Database error", details: dbError.message });
    }
  } catch (error: any) {
    console.error("ThreadRing creation error:", error);
    res.status(500).json({ error: "Failed to create ThreadRing", details: error.message });
  }
}