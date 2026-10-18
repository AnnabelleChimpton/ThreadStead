import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getUserBlockedIds, countHiddenComments, visibleCommentCount } from "@/lib/domain/users/blocks";

const MAX_POST_IDS = 100;

/**
 * Batch version of /api/comments/count.
 *
 * GET /api/comments/counts?postIds=id1,id2,id3
 * -> { counts: { id1: 3, id2: 0, id3: 12 } }
 *
 * Mirrors the single-count route's rules exactly: no auth required, only
 * comments with status "visible" are counted, a signed-in viewer's counts
 * leave out comments from people they blocked, and unknown ids return 0 to
 * avoid 404s in UIs.
 */
export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    const raw = String(req.query.postIds || "");
    const postIds = Array.from(
      new Set(
        raw
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      )
    );

    if (postIds.length === 0) {
      return res.status(400).json({ error: "postIds required" });
    }
    if (postIds.length > MAX_POST_IDS) {
      return res.status(400).json({ error: `Too many postIds (max ${MAX_POST_IDS})` });
    }

    const grouped = await db.comment.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds }, status: "visible" },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const id of postIds) counts[id] = 0;
    for (const group of grouped) counts[group.postId] = group._count._all;

    if (viewer && grouped.length > 0) {
      const { blockedUserIds } = await getUserBlockedIds(viewer.id);
      const hidden = await countHiddenComments(grouped.map((g) => g.postId), blockedUserIds);
      for (const id of hidden.keys()) counts[id] = visibleCommentCount(id, counts[id], hidden);
    }

    return res.json({ counts });
  }
);
