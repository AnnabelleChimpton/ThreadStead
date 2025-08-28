import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { generateThreadRingBadge, validateBadgeContent } from "@/lib/badge-generator";
import { BADGE_TEMPLATES } from "@/lib/threadring-badges";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { getRingHubClient } from "@/lib/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

export default withThreadRingSupport(async function handler(
  req: NextApiRequest, 
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  const { slug } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  // Use Ring Hub if enabled
  if (system === 'ringhub') {
    const client = getRingHubClient();
    if (client) {
      try {
        const ringDescriptor = await client.getRing(slug as string);
        if (!ringDescriptor) {
          return res.status(404).json({ error: "ThreadRing not found" });
        }

        if (req.method === 'GET') {
          // Generate a default badge for Ring Hub rings
          const defaultBadge = await generateThreadRingBadge(ringDescriptor.name, ringDescriptor.slug);
          return res.json({
            success: true,
            badge: {
              ...defaultBadge,
              id: `ringhub-${ringDescriptor.slug}`,
              isActive: true
            }
          });
        }

        if (req.method === "POST" || req.method === "PUT") {
          // Update RingHub ring badge
          const user = await getSessionUser(req);
          if (!user) {
            return res.status(401).json({ error: "Authentication required" });
          }

          const {
            title,
            subtitle,
            templateId,
            backgroundColor,
            textColor,
            imageUrl,
            imageDataUrl,
            isActive = true
          } = req.body;

          // Validate badge content
          const validation = validateBadgeContent(title || ringDescriptor.name, subtitle);
          if (!validation.valid) {
            return res.status(400).json({ 
              error: "Invalid badge content", 
              details: validation.errors 
            });
          }

          try {
            // Create authenticated client to update the ring
            const authenticatedClient = await createAuthenticatedRingHubClient(user.id);
            if (!authenticatedClient) {
              return res.status(503).json({ 
                error: "Service unavailable", 
                message: "Could not connect to RingHub service" 
              });
            }

            // Prepare the badge image URL for RingHub
            const badgeImageUrl = imageDataUrl || imageUrl;

            // Update the ring's badge in RingHub
            const updatedRing = await authenticatedClient.updateRing(slug, {
              badgeImageUrl,
              // Note: RingHub stores the actual badge image, not individual styling properties
              // The title, colors, etc. are embedded in the image itself
            });

            console.log(`✅ Successfully updated badge for RingHub ring: ${slug}`);

            // Return the updated badge data
            const badgeData = {
              id: `ringhub-${ringDescriptor.slug}`,
              title: title || ringDescriptor.name,
              subtitle,
              templateId,
              backgroundColor: backgroundColor || '#4A90E2',
              textColor: textColor || '#FFFFFF',
              imageUrl: updatedRing.badgeImageUrl,
              isActive,
              isGenerated: !title && !templateId && !backgroundColor && !textColor && !imageUrl
            };

            return res.json({
              success: true,
              badge: badgeData
            });

          } catch (ringHubError) {
            console.error(`❌ Failed to update badge for RingHub ring ${slug}:`, ringHubError);
            return res.status(500).json({
              error: "Failed to update badge in RingHub",
              message: ringHubError instanceof Error ? ringHubError.message : "Unknown error"
            });
          }
        }
      } catch (error) {
        console.error("Error fetching ring from Ring Hub:", error);
        // Fall through to local database
      }
    }
  }

  // Find the ThreadRing (local database)
  const threadRing = await db.threadRing.findUnique({
    where: { slug },
    include: {
      badge: true,
      curator: {
        select: { 
          id: true,
          handles: {
            select: {
              handle: true,
              host: true
            }
          }
        }
      }
    }
  });

  if (!threadRing) {
    return res.status(404).json({ error: "ThreadRing not found" });
  }

  if (req.method === "GET") {
    // Get current badge or generate default one
    if (threadRing.badge) {
      return res.json({
        success: true,
        badge: threadRing.badge
      });
    } else {
      // Generate a default badge
      const defaultBadge = await generateThreadRingBadge(threadRing.name, threadRing.slug);
      return res.json({
        success: true,
        badge: {
          ...defaultBadge,
          id: null, // Not saved yet
          threadRingId: threadRing.id,
          createdAt: null,
          updatedAt: null,
          createdBy: threadRing.curatorId
        },
        isGenerated: true
      });
    }
  }

  if (req.method === "POST" || req.method === "PUT") {
    // Create or update badge
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is curator
    if (threadRing.curatorId !== user.id) {
      return res.status(403).json({ error: "Only the ThreadRing curator can manage badges" });
    }

    const {
      title,
      subtitle,
      templateId,
      backgroundColor,
      textColor,
      imageUrl,
      isActive = true
    } = req.body;

    // Validate badge content
    const validation = validateBadgeContent(title || threadRing.name, subtitle);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: "Invalid badge content", 
        details: validation.errors 
      });
    }

    // Validate template if provided
    if (templateId && !BADGE_TEMPLATES.find(t => t.id === templateId)) {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    // Validate colors if provided
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (backgroundColor && !hexColorRegex.test(backgroundColor)) {
      return res.status(400).json({ error: "Invalid background color format" });
    }
    if (textColor && !hexColorRegex.test(textColor)) {
      return res.status(400).json({ error: "Invalid text color format" });
    }

    try {
      let badge;

      if (threadRing.badge) {
        // Update existing badge
        badge = await db.threadRingBadge.update({
          where: { id: threadRing.badge.id },
          data: {
            title: title || threadRing.name,
            subtitle,
            templateId,
            backgroundColor: backgroundColor || threadRing.badge.backgroundColor,
            textColor: textColor || threadRing.badge.textColor,
            imageUrl,
            isGenerated: !title && !templateId && !backgroundColor && !textColor && !imageUrl,
            isActive
          }
        });
      } else {
        // Create new badge
        const badgeData = title || templateId || backgroundColor || textColor || imageUrl
          ? {
              title: title || threadRing.name,
              subtitle,
              templateId,
              backgroundColor: backgroundColor || '#4A90E2',
              textColor: textColor || '#FFFFFF',
              imageUrl,
              isGenerated: false
            }
          : await generateThreadRingBadge(threadRing.name, threadRing.slug);

        badge = await db.threadRingBadge.create({
          data: {
            threadRingId: threadRing.id,
            title: badgeData.title,
            subtitle: badgeData.subtitle,
            templateId: badgeData.templateId,
            backgroundColor: badgeData.backgroundColor,
            textColor: badgeData.textColor,
            imageUrl,
            isGenerated: badgeData.isGenerated,
            isActive
          }
        });
      }

      return res.json({
        success: true,
        badge
      });

    } catch (error) {
      console.error("Badge creation/update error:", error);
      return res.status(500).json({
        error: "Failed to save badge",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete badge
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is curator
    if (threadRing.curatorId !== user.id) {
      return res.status(403).json({ error: "Only the ThreadRing curator can manage badges" });
    }

    if (!threadRing.badge) {
      return res.status(404).json({ error: "Badge not found" });
    }

    try {
      await db.threadRingBadge.delete({
        where: { id: threadRing.badge.id }
      });

      return res.json({
        success: true,
        message: "Badge deleted successfully"
      });

    } catch (error) {
      console.error("Badge deletion error:", error);
      return res.status(500).json({
        error: "Failed to delete badge",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
});