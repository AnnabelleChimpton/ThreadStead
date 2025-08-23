import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { generateThreadRingBadge } from "@/lib/badge-generator";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { AuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

export default withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  const { name, description, joinType, visibility, badge } = req.body;

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

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      try {
        const authenticatedClient = new AuthenticatedRingHubClient(viewer.id);
        
        // Generate slug for the fork
        const forkSlug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        // Map ThreadStead values to Ring Hub format
        const joinPolicyMapping = {
          'open': 'OPEN',
          'invite': 'INVITATION',
          'closed': 'CLOSED'
        };

        // Prepare Ring Hub fork data (matching Ring Hub API format)
        const forkData = {
          name: name.trim(),
          slug: forkSlug,
          description: description?.trim() || undefined,
          joinPolicy: (joinPolicyMapping[joinType as keyof typeof joinPolicyMapping] || 'OPEN') as 'OPEN' | 'APPLICATION' | 'INVITATION' | 'CLOSED',
          visibility: visibility.toUpperCase() as 'PUBLIC' | 'UNLISTED' | 'PRIVATE',
        };
        
        console.log('Ring Hub fork request:', { parentSlug: slug, forkData });
        
        // Fork ring via Ring Hub
        const forkedRing = await authenticatedClient.forkRing(slug as string, forkData);
        
        return res.json({
          success: true,
          threadRing: {
            id: forkedRing.slug,
            name: forkedRing.name,
            slug: forkedRing.slug,
            description: forkedRing.description,
            joinType: forkedRing.joinPolicy?.toLowerCase() || 'open',
            visibility: forkedRing.visibility?.toLowerCase() || 'public',
            uri: forkedRing.uri
          },
          message: `Successfully forked as "${forkedRing.name}"`
        });
        
      } catch (ringHubError: any) {
        console.error("Ring Hub fork error:", ringHubError);
        if (ringHubError.status === 404) {
          return res.status(404).json({ error: "ThreadRing not found" });
        }
        if (ringHubError.status === 403) {
          return res.status(403).json({ error: ringHubError.message || "Cannot fork this ThreadRing" });
        }
        if (ringHubError.status === 400) {
          return res.status(400).json({ error: ringHubError.message || "Invalid fork data" });
        }
        return res.status(500).json({ 
          error: "Failed to fork ThreadRing via Ring Hub", 
          details: ringHubError.message 
        });
      }
    }

    // Original local database logic

    // Find the original ThreadRing to fork
    const originalRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true,
        description: true,
        visibility: true,
        curatorId: true,
        lineageDepth: true,
        lineagePath: true,
        isSystemRing: true
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

    // Calculate lineage data for the forked ring
    const newLineageDepth = originalRing.lineageDepth + 1;
    const newLineagePath = originalRing.lineagePath 
      ? `${originalRing.lineagePath},${originalRing.id}`
      : originalRing.id;

    // Get all ancestor IDs from the lineage path for counter updates
    const ancestorIds = originalRing.lineagePath 
      ? originalRing.lineagePath.split(',').filter(Boolean)
      : [];
    ancestorIds.push(originalRing.id); // Include the direct parent

    // Create the forked ThreadRing
    const forkedRing = await db.$transaction(async (tx) => {
      // Create the new ThreadRing with hierarchical data
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
          // Hierarchical fields
          parentId: originalRing.id,
          lineageDepth: newLineageDepth,
          lineagePath: newLineagePath,
          directChildrenCount: 0, // New ring has no children
          totalDescendantsCount: 0, // New ring has no descendants
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

      // Update parent's direct children count
      await tx.threadRing.update({
        where: { id: originalRing.id },
        data: { 
          directChildrenCount: { increment: 1 }
        }
      });

      // Update ALL ancestors' total descendant counts (including the parent)
      if (ancestorIds.length > 0) {
        await tx.threadRing.updateMany({
          where: { 
            id: { in: ancestorIds }
          },
          data: { 
            totalDescendantsCount: { increment: 1 }
          }
        });
      }

      // Create badge if provided or generate default
      let badgeData;
      if (badge && (badge.templateId || badge.backgroundColor)) {
        // Use provided badge data
        badgeData = {
          templateId: badge.templateId,
          title: badge.title || name.trim(),
          subtitle: badge.subtitle,
          backgroundColor: badge.backgroundColor || '#4A90E2',
          textColor: badge.textColor || '#FFFFFF',
          isGenerated: false
        };
      } else {
        // Generate default badge
        badgeData = await generateThreadRingBadge(name.trim(), finalSlug);
      }

      await tx.threadRingBadge.create({
        data: {
          threadRingId: ring.id,
          title: badgeData.title,
          subtitle: badgeData.subtitle,
          templateId: badgeData.templateId,
          backgroundColor: badgeData.backgroundColor,
          textColor: badgeData.textColor,
          isGenerated: badgeData.isGenerated,
          isActive: true
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
});