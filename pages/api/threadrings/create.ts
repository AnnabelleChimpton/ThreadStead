import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { featureFlags } from "@/lib/feature-flags";
import { generateThreadRingBadge } from "@/lib/badge-generator";
import { uploadBadgeImage } from "@/lib/badge-uploader";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { AuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

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

export default withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (!featureFlags.threadrings()) {
    return res.status(404).json({ error: "Feature not available" });
  }

  try {
    console.log("ThreadRing create API called");
    
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    console.log("Getting session user...");
    const viewer = await getSessionUser(req);
    if (!viewer) return res.status(401).json({ error: "not logged in" });
    
    console.log("User found:", viewer.id);

  const { name, slug, description, joinType, visibility, badge, badgeImageUrl, badgeImageHighResUrl } = (req.body || {}) as {
    name?: string;
    slug?: string;
    description?: string;
    joinType?: ThreadRingJoinType;
    visibility?: ThreadRingVisibility;
    badge?: {
      templateId?: string;
      backgroundColor?: string;
      textColor?: string;
      title?: string;
      subtitle?: string;
    };
    badgeImageUrl?: string;
    badgeImageHighResUrl?: string;
  };

  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  // Generate or validate slug
  const finalSlug = slug?.trim() || slugify(name.trim());
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

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      try {
        console.log("Creating ThreadRing via Ring Hub with data:", {
          name: name.trim(),
          slug: finalSlug,
          joinType: validJoinType,
          visibility: validVisibility
        });

        const authenticatedClient = new AuthenticatedRingHubClient(viewer.id);
        
        // Map local joinType to RingHub joinPolicy
        const joinPolicyMap = {
          'open': 'OPEN',
          'invite': 'INVITATION', 
          'closed': 'CLOSED'
        } as const;

        // Generate and upload badge if no pre-uploaded URLs provided
        let badgeUrls = {};
        if (badgeImageUrl) {
          badgeUrls = {
            badgeImageUrl,
            badgeImageHighResUrl
          };
        } else {
          // Generate badge for the new ring using user's badge preferences
          try {
            const badgeOptions: any = {};
            
            // If user provided badge preferences, use them
            if (badge) {
              if (badge.templateId) badgeOptions.templateId = badge.templateId;
              if (badge.backgroundColor) badgeOptions.backgroundColor = badge.backgroundColor;
              if (badge.textColor) badgeOptions.textColor = badge.textColor;
              if (badge.title) badgeOptions.title = badge.title;
              if (badge.subtitle) badgeOptions.subtitle = badge.subtitle;
              // Don't use autoColor if user specified preferences
              badgeOptions.autoColor = false;
            } else {
              // No user preferences, use auto-color
              badgeOptions.autoColor = true;
            }
            
            const badgeData = await generateThreadRingBadge(name.trim(), finalSlug, badgeOptions);
            
            if (badgeData.imageDataUrl) {
              badgeUrls = await uploadBadgeImage(badgeData.imageDataUrl, finalSlug);
            }
          } catch (uploadError) {
            console.error('Badge generation/upload failed for new ring:', uploadError);
            // Continue without badge images - not a fatal error
          }
        }

        // Prepare Ring Hub ring descriptor
        const ringDescriptor = {
          name: name.trim(),
          slug: finalSlug,
          description: description?.trim() || undefined,
          joinPolicy: joinPolicyMap[validJoinType] as 'OPEN' | 'APPLICATION' | 'INVITATION' | 'CLOSED',
          visibility: validVisibility.toUpperCase() as 'PUBLIC' | 'UNLISTED' | 'PRIVATE',
          uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${finalSlug}`,
          spoolUri: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
          lineageDepth: 1, // Ring Hub will handle genealogy
          memberCount: 1,
          postCount: 0,
          descendantCount: 0,
          createdAt: new Date().toISOString(),
          curatorNotes: description?.trim() || undefined,
          // Add badge image URLs for Ring Hub
          ...badgeUrls
        };

        // Create ring in Ring Hub by forking from spool
        const createdRing = await authenticatedClient.forkRing('spool', ringDescriptor);
        
        console.log("ThreadRing created in Ring Hub:", createdRing.slug);
        return res.status(201).json({ ring: createdRing });
        
      } catch (ringHubError: any) {
        console.error("Ring Hub creation error:", ringHubError);
        return res.status(500).json({ 
          error: "Failed to create ThreadRing in Ring Hub", 
          details: ringHubError.message 
        });
      }
    }

    // Original local database logic
    try {
      console.log("Creating ThreadRing with data:", {
        name: name.trim(),
        slug: finalSlug,
        joinType: validJoinType,
        visibility: validVisibility
      });

      // Find The Spool to assign as parent for new ThreadRings
      const spool = await db.threadRing.findFirst({
        where: { isSystemRing: true },
        select: { id: true, lineageDepth: true, lineagePath: true }
      });

      if (!spool) {
        console.error("The Spool not found - cannot create ThreadRing without parent");
        return res.status(500).json({ error: "System error: genealogy root not found" });
      }

      // Calculate lineage data for the new ring
      const newLineageDepth = spool.lineageDepth + 1; // First level below The Spool
      const newLineagePath = spool.id; // The Spool is the only ancestor

      // Create the ThreadRing in a transaction to ensure counter updates
      const result = await db.$transaction(async (tx) => {
        // Create the ThreadRing with hierarchical data
        const ring = await tx.threadRing.create({
          data: {
            name: name.trim(),
            slug: finalSlug,
            description: description?.trim() || null,
            joinType: validJoinType as any, // Cast to avoid type issues
            visibility: validVisibility as any, // Cast to avoid type issues
            curatorId: viewer.id,
            uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${finalSlug}`,
            memberCount: 1, // Curator is automatically a member
            // Hierarchical fields
            parentId: spool.id,
            lineageDepth: newLineageDepth,
            lineagePath: newLineagePath,
            directChildrenCount: 0, // New ring has no children
            totalDescendantsCount: 0, // New ring has no descendants
          },
        });

        // Add the creator as a curator member
        await tx.threadRingMember.create({
          data: {
            threadRingId: ring.id,
            userId: viewer.id,
            role: "curator" as any, // Cast to avoid type issues
          },
        });

        // Update The Spool's counters
        await tx.threadRing.update({
          where: { id: spool.id },
          data: {
            directChildrenCount: { increment: 1 },
            totalDescendantsCount: { increment: 1 }
          }
        });

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

        return ring;
      });

      console.log("ThreadRing created with hierarchical data:", result.id);
      res.status(201).json({ ring: result });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      res.status(500).json({ error: "Database error", details: dbError.message });
    }
  } catch (error: any) {
    console.error("ThreadRing creation error:", error);
    res.status(500).json({ error: "Failed to create ThreadRing", details: error.message });
  }
});