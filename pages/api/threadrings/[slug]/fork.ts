import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { badgeChoiceSchema, drawAndUploadRingBadge } from "@/lib/rings/badge";
import { withThreadRingSupport } from "@/lib/api/ringhub/ringhub-middleware";
import { AuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(
  withCsrfProtection(
    withThreadRingSupport(async function handler(
      req: NextApiRequest,
      res: NextApiResponse,
      system: 'ringhub' | 'local'
    ) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  const { name, slug: customSlug, description, joinType, visibility, badge, badgeImageUrl, badgeImageHighResUrl } = req.body;


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

  // Validate custom slug if provided
  if (customSlug) {
    if (typeof customSlug !== "string" || customSlug.trim().length === 0) {
      return res.status(400).json({ error: "Slug must be a non-empty string" });
    }
    
    // Validate slug format according to Ring Hub standards
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(customSlug) || customSlug.startsWith('-') || customSlug.endsWith('-') || customSlug.includes('--')) {
      return res.status(400).json({ error: "Invalid slug format" });
    }
    
    if (customSlug.length < 3) {
      return res.status(400).json({ error: "Slug must be at least 3 characters" });
    }
    
    if (customSlug.length > 25) {
      return res.status(400).json({ error: "Slug must be 25 characters or less" });
    }
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
        
        // Use custom slug or generate from name
        let forkSlug;
        if (customSlug?.trim()) {
          // Use custom slug as-is (already validated by frontend)
          forkSlug = customSlug.trim();
        } else {
          // Generate slug from name
          forkSlug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        }
        
        // Map ThreadStead values to Ring Hub format
        const joinPolicyMapping = {
          'open': 'OPEN',
          'invite': 'INVITATION',
          'closed': 'CLOSED'
        };

        // Generate and upload badge if no pre-uploaded URLs provided
        let badgeUrls = {};
        if (badgeImageUrl) {
          badgeUrls = {
            badgeImageUrl,
            badgeImageHighResUrl
          };
        } else {
          // The badge they picked in the form, else the default; a new ring has no
          // theme colour yet, so its slug picks the palette
          try {
            const fallback = { template: 'label', glyph: 'rings' } as const;
            const picked = badgeChoiceSchema.safeParse({ ...fallback, ...badge });
            badgeUrls = await drawAndUploadRingBadge({ slug: forkSlug, name: name.trim() }, picked.success ? picked.data : fallback);
          } catch (uploadError) {
            console.error('Badge generation/upload failed for fork:', uploadError);
            // Continue without badge images - not a fatal error
          }
        }

        // Prepare Ring Hub fork data (matching Ring Hub API format)
        const forkData = {
          name: name.trim(),
          slug: forkSlug,
          description: description?.trim() || undefined,
          joinPolicy: (joinPolicyMapping[joinType as keyof typeof joinPolicyMapping] || 'OPEN') as 'OPEN' | 'APPLICATION' | 'INVITATION' | 'CLOSED',
          visibility: visibility.toUpperCase() as 'PUBLIC' | 'UNLISTED' | 'PRIVATE',
          // Members post; the hub's default lets anyone, member or not
          postPolicy: 'MEMBERS' as const,
          // Add badge image URLs for Ring Hub
          ...badgeUrls
        };
        
        // Fork ring via Ring Hub
        const forkedRing = await authenticatedClient.forkRing(slug as string, forkData);
        // The new ring in their lists and the directory, and in the parent's children
        forgetRingReads(forkedRing.slug, [viewer.id]);
        forgetRingReads(slug);

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
          message: `"${forkedRing.name}" is ready.`
        });
        
      } catch (ringHubError: any) {
        console.error("Ring Hub fork error:", ringHubError);
        
        // Handle rate limiting errors (429) - pass them through with proper structure
        if (ringHubError.status === 429 && ringHubError.data) {
          // Pass through the rate limit error data from RingHub
          return res.status(429).json(ringHubError.data);
        }
        
        if (ringHubError.status === 404) {
          return res.status(404).json({ error: "ThreadRing not found" });
        }
        if (ringHubError.status === 403) {
          return res.status(403).json({ error: ringHubError.message || "Cannot fork this ThreadRing" });
        }
        if (ringHubError.status === 400) {
          return res.status(400).json({ error: ringHubError.message || "Invalid fork data" });
        }
        if (ringHubError.status === 401) {
          return res.status(401).json({ error: "Authentication required" });
        }
        
        // For any other error, return a generic error with details
        return res.status(ringHubError.status || 500).json({ 
          error: ringHubError.message || "Failed to fork ThreadRing via Ring Hub", 
          details: ringHubError.data || ringHubError.message 
        });
      }
    }

    // Rings live on Ring Hub; there's no local-only ring to start any more
    return res.status(503).json({ error: "Starting a ring needs Ring Hub, and it's off here." });

  } catch (error) {
    console.error("Error forking ThreadRing:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
    })
  )
);