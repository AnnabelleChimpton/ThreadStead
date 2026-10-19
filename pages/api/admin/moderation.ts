import { z } from "zod";
import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getModerationHistory, MAX_REASON_LENGTH, moderateUser } from "@/lib/domain/users/moderation";
import { resetProfilePage } from "@/lib/domain/users/page-reset";

const reason = z.string().trim().max(MAX_REASON_LENGTH, `Keep the reason under ${MAX_REASON_LENGTH} characters`);
const base = { userId: z.string().min(1), reportId: z.string().min(1).optional() };

/** A day from the date picker (YYYY-MM-DD) is the start of that day, UTC. */
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), until: day, reason, ...base }),
  z.object({ action: z.literal("ban"), reason, ...base }),
  z.object({ action: z.literal("lift"), reason: reason.optional(), ...base }),
  z.object({ action: z.literal("reset_page"), reason: reason.min(1, "Say why"), ...base }),
]);

/**
 * GET  ?userId=  the account's moderation history, and what deleting it would touch
 * POST { action: suspend | ban | lift | reset_page, userId, until?, reason?, reportId? }
 */
export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: admin }) => {
    if (req.method === "GET") {
      const userId = String(req.query.userId || "");
      if (!userId) return res.status(400).json({ error: "User ID is required" });

      const [history, posts, ringPosts, key] = await Promise.all([
        getModerationHistory(userId),
        db.post.count({ where: { authorId: userId } }),
        db.post.count({ where: { authorId: userId, threadRings: { some: {} } } }),
        db.userDID.findUnique({ where: { userId }, select: { userId: true } }),
      ]);
      return res.json({ history, posts, ringPosts, hasKey: !!key });
    }

    const input = actionSchema.parse(req.body);
    if (input.action === "reset_page") {
      const page = await resetProfilePage({ actorId: admin.id, userId: input.userId, reason: input.reason, reportId: input.reportId });
      return res.json({ page });
    }
    const result = await moderateUser(
      input.action === "suspend"
        ? { action: "suspend", until: input.until, reason: input.reason }
        : input.action === "ban"
          ? { action: "ban", reason: input.reason }
          : { action: "lift", reason: input.reason },
      { actorId: admin.id, userId: input.userId, reportId: input.reportId }
    );
    return res.json({ user: result });
  }
);
