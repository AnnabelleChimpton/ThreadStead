import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { AuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

export default withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  const { 
    name, 
    description, 
    shortCode,
    joinType, 
    visibility, 
    postPolicy,
    curatorNote,
    badgeImageUrl,
    badgeImageHighResUrl
  } = req.body;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  // Validate inputs
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "ThreadRing name must be a non-empty string" });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: "ThreadRing name must be 100 characters or less" });
    }
  }

  if (description !== undefined && description.length > 500) {
    return res.status(400).json({ error: "Description must be 500 characters or less" });
  }

  if (shortCode !== undefined) {
    if (typeof shortCode !== "string" || shortCode.length < 2 || shortCode.length > 10) {
      return res.status(400).json({ error: "Short code must be 2-10 characters" });
    }
    const shortCodePattern = /^[a-zA-Z0-9-]+$/;
    if (!shortCodePattern.test(shortCode)) {
      return res.status(400).json({ error: "Short code can only contain alphanumeric characters and hyphens" });
    }
  }

  if (curatorNote !== undefined && curatorNote.length > 1000) {
    return res.status(400).json({ error: "Curator note must be 1000 characters or less" });
  }

  if (joinType !== undefined && !["open", "invite", "application", "closed"].includes(joinType)) {
    return res.status(400).json({ error: "Invalid join type" });
  }

  if (visibility !== undefined && !["public", "unlisted", "private"].includes(visibility)) {
    return res.status(400).json({ error: "Invalid visibility" });
  }

  if (postPolicy !== undefined && !["open", "members", "curated", "closed"].includes(postPolicy)) {
    return res.status(400).json({ error: "Invalid post policy" });
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
        
        // Map local values to RingHub format
        const joinPolicyMap = {
          'open': 'OPEN',
          'invite': 'INVITATION',
          'application': 'APPLICATION',
          'closed': 'CLOSED'
        } as const;

        const postPolicyMap = {
          'open': 'OPEN',
          'members': 'MEMBERS',
          'curated': 'CURATED',
          'closed': 'CLOSED'
        } as const;
        
        // Build updates object - only include fields that were provided
        const updates: any = {};
        
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description.trim() || undefined;
        if (shortCode !== undefined) updates.shortCode = shortCode.trim();
        if (joinType !== undefined) updates.joinPolicy = joinPolicyMap[joinType as keyof typeof joinPolicyMap];
        if (visibility !== undefined) updates.visibility = visibility.toUpperCase() as 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
        if (postPolicy !== undefined) updates.postPolicy = postPolicyMap[postPolicy as keyof typeof postPolicyMap];
        if (curatorNote !== undefined) updates.curatorNote = curatorNote.trim() || undefined;
        if (badgeImageUrl !== undefined) updates.badgeImageUrl = badgeImageUrl;
        if (badgeImageHighResUrl !== undefined) updates.badgeImageHighResUrl = badgeImageHighResUrl;

        // Update ring in Ring Hub
        const updatedRing = await authenticatedClient.updateRing(slug as string, updates);
        
        return res.json({
          success: true,
          message: "Settings updated successfully",
          threadRing: {
            id: updatedRing.id,
            slug: updatedRing.slug,
            name: updatedRing.name,
            description: updatedRing.description,
            shortCode: updatedRing.shortCode,
            visibility: updatedRing.visibility?.toLowerCase(),
            joinType: updatedRing.joinPolicy?.toLowerCase(),
            postPolicy: updatedRing.postPolicy?.toLowerCase(),
            curatorNote: updatedRing.curatorNote || updatedRing.curatorNotes,
            badgeImageUrl: updatedRing.badgeImageUrl,
            badgeImageHighResUrl: updatedRing.badgeImageHighResUrl
          }
        });
        
      } catch (ringHubError: any) {
        console.error("Ring Hub settings update error:", ringHubError);
        if (ringHubError.status === 404) {
          return res.status(404).json({ error: "ThreadRing not found" });
        }
        if (ringHubError.status === 403) {
          return res.status(403).json({ error: "Insufficient permissions to update settings" });
        }
        return res.status(500).json({ 
          error: "Failed to update ThreadRing settings", 
          details: ringHubError.message 
        });
      }
    }

    // Original local database logic (keeping slug immutable per Ring Hub spec)
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        curatorId: true,
        name: true,
        slug: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if viewer is the curator
    if (threadRing.curatorId !== viewer.id) {
      return res.status(403).json({ error: "Only the curator can update settings" });
    }

    // Build update data - only include fields that were provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim() || null;
    if (joinType !== undefined) updateData.joinType = joinType;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (curatorNote !== undefined) updateData.curatorNote = curatorNote.trim() || null;
    // Note: postPolicy, shortCode, and badge URLs not supported in local database

    // Update the ThreadRing
    const updated = await db.threadRing.update({
      where: { id: threadRing.id },
      data: updateData
    });

    return res.json({
      success: true,
      message: "Settings updated successfully",
      threadRing: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description,
        visibility: updated.visibility,
        joinType: updated.joinType,
        curatorNote: updated.curatorNote
      }
    });

  } catch (error) {
    console.error("Error updating ThreadRing settings:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});