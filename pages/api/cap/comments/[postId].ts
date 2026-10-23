import type { NextApiRequest, NextApiResponse } from "next";
import { capabilityHolder, mintCapability, classifyExternalPostId } from "@/lib/domain/users/capabilities";
import { db } from "@/lib/config/database/connection";
import { sameOriginProtection } from "@/lib/server/http/same-origin";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // cookie-authed and not on apiHandler: refuse cross-origin posts here
  if (!sameOriginProtection(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await capabilityHolder(req, res);
  if (!viewer) return;

  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  // Check local database first
  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true } });

  // If not found locally, it may be an external (RingHub) post. Only accept the
  // `ringhub-<PostRefId>` form the feed UI actually emits, and gate on a
  // server-controlled surrogate key so a client can't mint a capability for an
  // arbitrary attacker-chosen primary key. See classifyExternalPostId.
  let capPostId = postId;
  if (!post) {
    const classified = classifyExternalPostId(postId);
    if (classified.kind !== "external") {
      return res.status(404).json({ error: "post not found" });
    }
    // Bind the capability to the exact id the client sent (which, for a valid
    // external post, equals the server-derived surrogate key).
    capPostId = classified.dbId;
  }

  const resource = `post:${capPostId}/comments`;
  const token = await mintCapability(viewer.id, ["write:comment"], resource, 10 * 60);
  res.json({ token, resource, expSec: 600 });
}
