import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { deleteUserAccount } from "@/lib/domain/users/account-removal";

const schema = z.object({
  userId: z.string().min(1, "User ID is required"),
  /** Delete even if some ring posts couldn't come off Ring Hub. */
  force: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Hard delete, the step after a ban (lib/domain/users/account-removal.ts).
 * Takes the account's ring posts off Ring Hub first. If any of those fail it
 * answers 409 with the list and deletes nothing, unless `force` is set.
 */
export default apiHandler(
  { methods: ["DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: adminUser }) => {
    const { userId, force, reason } = schema.parse(req.body ?? {});
    const result = await deleteUserAccount({ actorId: adminUser.id, userId, force, reason });

    const removed = result.cleanup.removals.filter((r) => r.outcome === "removed").length;
    if (!result.deleted) {
      return res.status(409).json({
        error: `${result.cleanup.failed.length} ring post(s) couldn't come off Ring Hub, so nothing was deleted.`,
        removed,
        failed: result.cleanup.failed,
      });
    }

    res.json({ success: true, removed, failed: result.cleanup.failed });
  }
);
