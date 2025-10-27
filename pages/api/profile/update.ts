import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { requireAction } from "@/lib/domain/users/capabilities";
import { cleanCss } from "@/lib/utils/sanitization/css";
import { notifyRingHubIfMember } from "@/lib/api/ringhub/ringhub-profile-sync";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";



async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const { displayName, bio, customCSS, blogroll, featuredFriends, templateMode, includeSiteCSS, hideNavigation, visibility, cap } = (req.body || {}) as {
    displayName?: string;
    bio?: string;
    customCSS?: string;
    blogroll?: unknown[];
    featuredFriends?: unknown[];
    templateMode?: 'default' | 'enhanced' | 'advanced';
    includeSiteCSS?: boolean;
    hideNavigation?: boolean;
    visibility?: 'public' | 'private' | 'friends' | 'followers';
    cap?: string;
  };

  if (!cap) return res.status(401).json({ error: "capability required" });
  const resource = `user:${me.id}/profile`;
  const ok = await requireAction("write:profile", (resStr) => resStr === resource)(cap).catch(() => null);
  if (!ok) return res.status(403).json({ error: "invalid capability" });

  // Get current profile to check for visibility changes
  const currentProfile = await db.profile.findUnique({
    where: { userId: me.id },
    select: { visibility: true }
  });

  // Basic trims & constraints
  const data: Record<string, unknown> = {};
  if (typeof displayName === "string") data.displayName = displayName.trim().slice(0, 80);
  if (typeof bio === "string") data.bio = bio.trim().slice(0, 1000);
  if (typeof customCSS === "string") data.customCSS = cleanCss(customCSS);
  if (typeof templateMode === "string" && ['default', 'enhanced', 'advanced'].includes(templateMode)) {
    data.templateMode = templateMode;
  }
  if (typeof includeSiteCSS === "boolean") data.includeSiteCSS = includeSiteCSS;
  if (typeof hideNavigation === "boolean") data.hideNavigation = hideNavigation;

  // Handle visibility changes
  let visibilityChanged = false;
  const oldVisibility = currentProfile?.visibility;
  if (typeof visibility === "string" && ['public', 'private', 'friends', 'followers'].includes(visibility)) {
    data.visibility = visibility;
    // Track if visibility is changing to/from public (affects federated profile data)
    visibilityChanged = oldVisibility !== visibility && (oldVisibility === 'public' || visibility === 'public');
  }
  
  // Handle blogroll/websites
  if (Array.isArray(blogroll)) {
    const sanitizedBlogroll = blogroll
      .filter(item => 
        typeof item === 'object' && 
        item !== null && 
        typeof (item as Record<string, unknown>).label === 'string' &&
        typeof (item as Record<string, unknown>).url === 'string'
      )
      .slice(0, 10) // Max 10 websites
      .map(item => {
        const obj = item as Record<string, unknown>;
        return {
          id: String(obj.id || Date.now()),
          label: String(obj.label).trim().slice(0, 50),
          url: String(obj.url).trim().slice(0, 500),
          blurb: String(obj.blurb || "").trim().slice(0, 200)
        };
      });
    data.blogroll = sanitizedBlogroll;
  }

  // Handle featuredFriends
  if (Array.isArray(featuredFriends)) {
    const sanitizedFriends = featuredFriends
      .filter(item => 
        typeof item === 'object' && 
        item !== null && 
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).handle === 'string'
      )
      .slice(0, 8) // Max 8 featured friends
      .map(item => {
        const obj = item as Record<string, unknown>;
        return {
          id: String(obj.id),
          handle: String(obj.handle).trim().slice(0, 50),
          displayName: String(obj.displayName || "").trim().slice(0, 100),
          avatarUrl: String(obj.avatarUrl || "/assets/default-avatar.gif").trim().slice(0, 500)
        };
      });
    data.featuredFriends = sanitizedFriends;
  }

  // Ensure profile exists
  await db.profile.upsert({
    where: { userId: me.id },
    update: data,
    create: { userId: me.id, ...data },
  });

  // Notify RingHub of profile update if user is in any federated rings
  // (Fire-and-forget - don't wait for response or block on errors)
  // Trigger notification if:
  // - Display name changed
  // - Bio changed
  // - Visibility changed to/from public (affects what data is in DID document)
  if (data.displayName || data.bio || visibilityChanged) {
    notifyRingHubIfMember(me.id, db).catch(err => {
      console.error('Failed to notify RingHub of profile update:', err);
    });
  }

  return res.status(200).json({ ok: true });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('profile_metadata')(withCsrfProtection(handler));
