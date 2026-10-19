import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api/handler";
import { listOwnershipCandidates, transferRingOwnership } from "@/lib/domain/threadrings/ownership-transfer";

const schema = z.object({
  newOwnerUserId: z.string().min(1, "Pick who takes it over"),
  reason: z.string().max(500).optional(),
});

/**
 * Hand a Ring Hub ring to another member (lib/domain/threadrings/ownership-transfer.ts).
 * GET: who could take it over. POST: hand it over. The ring's owner, or an admin.
 */
export default apiHandler(
  { methods: ["GET", "POST"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user }) => {
    const slug = req.query.slug;
    if (typeof slug !== "string") throw new ApiError(400, "Invalid slug");
    const actor = { id: user.id, role: user.role };

    if (req.method === "GET") {
      return res.json({ candidates: await listOwnershipCandidates(slug, actor) });
    }

    const { newOwnerUserId, reason } = schema.parse(req.body ?? {});
    const transfer = await transferRingOwnership({ slug, actor, newOwnerUserId, reason });
    const handle = transfer.newOwner.handle?.split("@")[0] ?? "them";
    res.json({
      success: true,
      message: `@${handle} owns it now.`,
      ...transfer,
    });
  }
);
