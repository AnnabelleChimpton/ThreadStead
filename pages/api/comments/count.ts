import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (req, res) => {
    const postId = String(req.query.postId || "");
    if (!postId) return res.status(400).json({ error: "postId required" });

    // Return 0 for unknown ids to avoid 404s in UIs
    const count = await db.comment.count({ where: { postId, status: "visible" } });
    return res.json({ count });
  }
);
