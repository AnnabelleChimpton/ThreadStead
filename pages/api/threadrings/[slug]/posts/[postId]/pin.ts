import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";
import { curateRingPost, curateFailure } from "@/lib/rings/curate";

/**
 * Pin (POST) or unpin (DELETE) a post in a ring. `postId` is the hub's
 * PostRef id: the hub owns pinning, and decides who may (the ring's host and
 * moderators), from the signer's role in the ring.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug, postId } = req.query;
  if (typeof slug !== "string" || typeof postId !== "string") {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  const viewer = await getSessionUser(req);
  if (!viewer) {
    return res.status(401).json({ error: "Sign in first." });
  }

  try {
    const result = await curateRingPost(viewer.id, slug, postId, req.method === "POST" ? "pin" : "unpin");
    return res.json({ isPinned: !!result.post?.pinned });
  } catch (error) {
    const [status, message] = curateFailure(error);
    return res.status(status).json({ error: message });
  }
}

export default withRateLimit('threadring_operations')(withCsrfProtection(handler));
