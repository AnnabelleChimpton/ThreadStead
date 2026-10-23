import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { getBlueskyState, linkBluesky, unlinkBluesky } from "@/lib/domain/bluesky/handle-links";

const linkSchema = z.object({ input: z.string().max(300) });

/**
 * Settings → Bluesky (lib/domain/bluesky/handle-links.ts).
 * GET     their address and link
 * POST    { input }: the Bluesky handle or DID they have now; starts a pending link
 * DELETE  stop using the address as their handle
 */
export default apiHandler(
  { methods: ["GET", "POST", "DELETE"], auth: "user", rateLimit: "default" },
  async (req, res, { user }) => {
    if (req.method === "GET") return res.json(await getBlueskyState(user.id));
    if (req.method === "DELETE") return res.json(await unlinkBluesky(user.id));
    const { input } = linkSchema.parse(req.body ?? {});
    return res.json(await linkBluesky(user.id, input));
  }
);
