import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { mintCapability } from "@/lib/domain/users/capabilities";
import { db } from "@/lib/config/database/connection";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  // Check local database first
  let post = await db.post.findUnique({ where: { id: postId }, select: { id: true } });
  
  // If not found locally, check if it's a valid Ring Hub post
  if (!post) {
    // Ring Hub posts can have various ID formats:
    // - 'external-' prefix (e.g., 'external-welcome-xxx')
    // - 'rhp_' prefix
    // - Contains ':' (e.g., 'did:plc:xxx:post:xxx')
    // - UUID format with dashes (more than 2 dashes indicates likely external)
    const isLikelyExternal = 
      postId.startsWith('external-') ||
      postId.startsWith('rhp_') || 
      postId.includes(':') ||
      (postId.includes('-') && postId.split('-').length > 3); // UUID-like format
    
    if (isLikelyExternal) {
      // It's an external post, allow commenting
      post = { id: postId }; // Create virtual post object
    } else {
      return res.status(404).json({ error: "post not found" });
    }
  }

  const resource = `post:${postId}/comments`;
  const token = await mintCapability(viewer.id, ["write:comment"], resource, 10 * 60);
  res.json({ token, resource, expSec: 600 });
}
