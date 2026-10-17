// pages/api/rel/[username].ts
import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { SITE_NAME } from "@/lib/config/site/constants";



export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    const username = String(req.query.username || "");
    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: { user: true },
    });
    if (!handle) return res.status(404).json({ error: "not found" });

    if (!viewer) return res.json({ status: "anon", isOwner: false });

    const authorId = handle.user.id;
    const isOwner = viewer.id === authorId;

    const [viewerFollows, authorFollows] = await Promise.all([
      db.follow.findUnique({ where: { followerId_followeeId: { followerId: viewer.id, followeeId: authorId } } }),
      db.follow.findUnique({ where: { followerId_followeeId: { followerId: authorId, followeeId: viewer.id } } }),
    ]);

    const vf = viewerFollows?.status === "accepted";
    const af = authorFollows?.status === "accepted";
    const status = isOwner ? "owner" : vf && af ? "friends" : vf ? "following" : af ? "followed_by" : "none";

    res.json({ status, isOwner });
  }
);
