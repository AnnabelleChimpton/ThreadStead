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
  const { name, description, joinType, visibility, curatorNote } = req.body;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  // Validate inputs
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "ThreadRing name is required" });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({ error: "ThreadRing name must be 100 characters or less" });
  }

  if (description && description.length > 500) {
    return res.status(400).json({ error: "Description must be 500 characters or less" });
  }

  if (curatorNote && curatorNote.length > 300) {
    return res.status(400).json({ error: "Curator note must be 300 characters or less" });
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
        
        // Map local joinType to RingHub joinPolicy
        const joinPolicyMap = {
          'open': 'OPEN',
          'invite': 'INVITATION',
          'closed': 'CLOSED'
        } as const;
        
        // Validate joinType
        if (!joinType || !['open', 'invite', 'closed'].includes(joinType)) {
          return res.status(400).json({ error: "Invalid join type" });
        }
        
        // Prepare Ring Hub ring updates with correct field names and formats
        const updates = {
          name: name.trim(),
          description: description?.trim() || undefined,
          joinPolicy: joinPolicyMap[joinType as keyof typeof joinPolicyMap],
          visibility: visibility.toUpperCase() as 'PUBLIC' | 'UNLISTED' | 'PRIVATE',
          curatorNote: curatorNote?.trim() || undefined
        };

        // Update ring in Ring Hub
        const updatedRing = await authenticatedClient.updateRing(slug as string, updates);
        
        return res.json({
          success: true,
          message: "Settings updated successfully",
          newSlug: updatedRing.slug !== slug ? updatedRing.slug : undefined
        });
        
      } catch (ringHubError: any) {
        console.error("Ring Hub settings update error:", ringHubError);
        if (ringHubError.status === 404) {
          return res.status(404).json({ error: "ThreadRing not found" });
        }
        if (ringHubError.status === 403) {
          return res.status(403).json({ error: "Only the curator can update settings" });
        }
        return res.status(500).json({ 
          error: "Failed to update ThreadRing settings in Ring Hub", 
          details: ringHubError.message 
        });
      }
    }

    // Original local database logic

    // Find the ThreadRing
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

    // Generate new slug if name changed
    let newSlug = threadRing.slug;
    if (name.trim() !== threadRing.name) {
      const baseSlug = name.trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);

      let finalSlug = baseSlug;
      let counter = 1;

      // Ensure slug uniqueness (but allow keeping current slug)
      while (true) {
        const existing = await db.threadRing.findUnique({
          where: { slug: finalSlug }
        });
        
        if (!existing || existing.id === threadRing.id) break;
        
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        
        if (counter > 100) {
          return res.status(400).json({ 
            error: "Unable to generate unique slug. Please choose a different name." 
          });
        }
      }

      newSlug = finalSlug;
    }

    // Update the ThreadRing
    const updated = await db.threadRing.update({
      where: { id: threadRing.id },
      data: {
        name: name.trim(),
        slug: newSlug,
        description: description?.trim() || null,
        joinType,
        visibility,
        curatorNote: curatorNote?.trim() || null,
        // Update URI if slug changed
        ...(newSlug !== threadRing.slug ? {
          uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${newSlug}`
        } : {})
      }
    });

    return res.json({
      success: true,
      message: "Settings updated successfully",
      newSlug: updated.slug !== threadRing.slug ? updated.slug : undefined
    });

  } catch (error) {
    console.error("Error updating ThreadRing settings:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});