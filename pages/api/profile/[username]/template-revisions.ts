import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";

// Owner-only read access to profile customization restore points.
// GET             -> list of revision metadata, newest first
// GET ?id=<id>    -> one revision with full template/CSS content
export default apiHandler(
  { methods: ['GET'], auth: 'user', rateLimit: 'template_editing' },
  async (req, res, { user: currentUser }) => {
    try {
      const username = String(req.query.username);

      const handle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: { select: { id: true } } }
      });
      if (!handle) {
        return res.status(404).json({ error: "User not found" });
      }
      if (handle.user.id !== currentUser.id) {
        return res.status(403).json({ error: "You can only view your own history" });
      }

      const revisionId = req.query.id ? String(req.query.id) : null;

      if (revisionId) {
        const revision = await db.profileTemplateRevision.findFirst({
          where: { id: revisionId, userId: handle.user.id }
        });
        if (!revision) {
          return res.status(404).json({ error: "Revision not found" });
        }
        return res.status(200).json({ revision });
      }

      const revisions = await db.profileTemplateRevision.findMany({
        where: { userId: handle.user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          trigger: true,
          templateMode: true,
          cssMode: true,
          hideNavigation: true,
          createdAt: true,
          customTemplate: true,
          customCSS: true,
        }
      });

      // List view carries sizes, not bodies — a revision can be ~100KB of CSS.
      return res.status(200).json({
        revisions: revisions.map(r => ({
          id: r.id,
          trigger: r.trigger,
          templateMode: r.templateMode,
          cssMode: r.cssMode,
          hideNavigation: r.hideNavigation,
          createdAt: r.createdAt,
          templateChars: r.customTemplate?.length ?? 0,
          cssChars: r.customCSS?.length ?? 0,
        }))
      });
    } catch (error) {
      console.error("Error reading template revisions:", error);
      return res.status(500).json({ error: "Failed to load history" });
    }
  }
);
