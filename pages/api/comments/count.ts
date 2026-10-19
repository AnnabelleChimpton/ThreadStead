import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getHiddenIds, countHiddenComments, visibleCommentCount } from "@/lib/domain/users/blocks";

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    const postId = String(req.query.postId || "");
    if (!postId) return res.status(400).json({ error: "postId required" });

    // Return 0 for unknown ids to avoid 404s in UIs
    const count = await db.comment.count({ where: { postId, status: "visible" } });

    // A signed-in viewer's count leaves out comments from people they blocked
    if (count === 0) return res.json({ count });
    const { blockedUserIds } = await getHiddenIds(viewer?.id);
    const hidden = await countHiddenComments([postId], blockedUserIds);
    return res.json({ count: visibleCommentCount(postId, count, hidden) });
  }
);
