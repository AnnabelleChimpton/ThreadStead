import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";
import { curateRingPost, curateFailure } from "@/lib/rings/curate";

/**
 * Take a post out of a ring. `postId` is the hub's PostRef id: the hub owns
 * what's in a ring, and decides who may (the ring's host and moderators).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug, postId } = req.query;
  const { reason } = req.body || {};
  if (typeof slug !== "string" || typeof postId !== "string") {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  const viewer = await getSessionUser(req);
  if (!viewer) {
    return res.status(401).json({ error: "Sign in first." });
  }

  try {
    await curateRingPost(viewer.id, slug, postId, "remove", typeof reason === "string" ? reason.slice(0, 500) : undefined);
    return res.json({ removed: true });
  } catch (error) {
    const [status, message] = curateFailure(error);
    return res.status(status).json({ error: message });
  }
}

export default withRateLimit('threadring_operations')(withCsrfProtection(handler));
