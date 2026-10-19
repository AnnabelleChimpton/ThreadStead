import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { deleteUserAccount } from "@/lib/domain/users/account-removal";

const schema = z.object({
  userId: z.string().min(1, "User ID is required"),
  /** Delete even if the account owns rings, or some Ring Hub cleanup failed. */
  force: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Hard delete, the step after a ban (lib/domain/users/account-removal.ts).
 * Takes the account's ring posts off Ring Hub and leaves its rings first.
 * Answers 409 and deletes nothing when the account owns rings
 * (code "owns_rings") or a hub step failed ("hub_failures"), unless `force`.
 */
export default apiHandler(
  { methods: ["DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: adminUser }) => {
    const { userId, force, reason } = schema.parse(req.body ?? {});
    const { deleted, blockedBy, report } = await deleteUserAccount({ actorId: adminUser.id, userId, force, reason });

    const removed = report.posts.removals.filter((r) => r.outcome === "removed").length;
    const left = report.leaves.filter((l) => l.outcome === "left").length;
    const ownedRings = report.ownedRings.map((r) => ({ slug: r.ringSlug, name: r.ringName }));
    if (!deleted) {
      const count = blockedBy === "owns_rings" ? ownedRings.length : report.failures.length;
      return res.status(409).json({
        error:
          blockedBy === "owns_rings"
            ? `They own ${count} ring${count === 1 ? "" : "s"} on Ring Hub, so nothing was deleted.`
            : `${count} Ring Hub step${count === 1 ? "" : "s"} failed, so nothing was deleted.`,
        code: blockedBy,
        removed,
        left,
        ownedRings,
        failed: report.failures,
      });
    }

    res.json({ success: true, removed, left, ownedRings, failed: report.failures });
  }
);
