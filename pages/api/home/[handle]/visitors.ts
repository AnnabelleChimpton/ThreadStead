import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getClientIp } from "@/lib/server/http/client-ip";
import { residentAccess, sendPrivateProfile } from "@/lib/domain/users/profile-access";
import { showsInTrails, trailVisitorWhere } from "@/lib/pixel-homes/visitor-trail";
import { countVisit, otherVisitsThisWeek, pruneVisitCounts, utcDay } from "@/lib/pixel-homes/visit-count";

/** Visits are shown, and kept, for a week. */
const VISITOR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Faces in the trail. */
const TRAIL_LENGTH = 5;

let lastPrunedDay = 0;

/**
 * Who stopped by a pixel home.
 *
 * POST records a visit. A signed-in visitor with "Show me in visitor trails"
 * on (the default) goes in the trail; everyone else, signed out included, is
 * only added to the day's count (lib/pixel-homes/visit-count.ts), which keeps
 * nothing about them. The owner's own visits aren't recorded.
 *
 * GET returns the trail and that count. The trail only shows visitors who
 * still have the setting on, whose profile this viewer may see, and who
 * aren't blocked either way by the viewer or the owner.
 */
export default apiHandler(
  // no CSRF today: components/pixel-homes/VisitorTrail.tsx POSTs with plain fetch
  { methods: ["GET", "POST"], auth: "optional", csrf: false },
  async (req, res, { user: visitor }) => {
    const { handle } = req.query;

    if (typeof handle !== 'string') {
      return res.status(400).json({ error: "Invalid handle" });
    }

    try {
      // Remove @ prefix if present
      const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

      // Find user by handle
      const userHandle = await db.handle.findFirst({
        where: { handle: cleanHandle.toLowerCase() },
        include: { user: { select: { id: true, homeConfig: { select: { userId: true } } } } }
      });

      if (!userHandle) {
        return res.status(404).json({ error: "User not found" });
      }

      const homeOwnerId = userHandle.user.id;

      // No visits to, or visitor lists of, a home the viewer can't see
      const access = await residentAccess(visitor, homeOwnerId);
      if (!access.visible) return sendPrivateProfile(res, access.visibility);

      if (req.method === "POST") {
        // Don't track the home owner visiting their own home
        if (visitor?.id === homeOwnerId) {
          return res.json({ ok: true, recorded: "none" });
        }
        if (!userHandle.user.homeConfig) {
          return res.status(404).json({ error: "No pixel home" });
        }

        const now = new Date();
        const inTrail = visitor ? await showsInTrails(db, visitor.id) : false;

        if (visitor && inTrail) {
          // One row per visitor per home, moved to the front on each visit
          await db.pixelHomeVisitor.upsert({
            where: { homeOwnerId_visitorId: { homeOwnerId, visitorId: visitor.id } },
            create: { homeOwnerId, visitorId: visitor.id, visitedAt: now },
            update: { visitedAt: now },
          });
          // Clean up old visits (older than 7 days) to keep the table manageable
          await db.pixelHomeVisitor.deleteMany({
            where: { homeOwnerId, visitedAt: { lt: new Date(now.getTime() - VISITOR_WINDOW_MS) } }
          });
        } else {
          const counted = await countVisit(
            db,
            homeOwnerId,
            visitor
              ? { kind: "user", userId: visitor.id }
              : { kind: "anonymous", ip: getClientIp(req), userAgent: req.headers["user-agent"] ?? null },
            now
          );
          if (counted) await pruneVisitCounts(db, now, homeOwnerId);
        }

        // Once a day, drop counts that have fallen out of the week everywhere
        const day = utcDay(now).getTime();
        if (day !== lastPrunedDay) {
          lastPrunedDay = day;
          await pruneVisitCounts(db, now);
        }

        return res.json({ ok: true, recorded: inTrail ? "trail" : "count" });
      }

      // GET
      const since = new Date(Date.now() - VISITOR_WINDOW_MS);
      const [recentVisitors, otherVisits] = await Promise.all([
        db.pixelHomeVisitor.findMany({
          where: {
            homeOwnerId,
            visitedAt: { gte: since },
            visitor: trailVisitorWhere(homeOwnerId, visitor?.id),
          },
          include: {
            visitor: {
              include: {
                handles: true,
                profile: { select: { displayName: true, avatarUrl: true } }
              }
            }
          },
          orderBy: { visitedAt: 'desc' },
          take: TRAIL_LENGTH
        }),
        otherVisitsThisWeek(db, homeOwnerId),
      ]);

      const visitors = recentVisitors.map(visit => ({
        id: visit.visitor.id,
        username: (visit.visitor.handles.find(h => h.host === 'threadstead.com') || visit.visitor.handles[0])?.handle || 'anonymous',
        displayName: visit.visitor.profile?.displayName || null,
        avatarUrl: visit.visitor.profile?.avatarUrl || null,
        visitedAt: visit.visitedAt.toISOString()
      }));

      return res.json({
        success: true,
        visitors,
        count: visitors.length,
        otherVisits,
      });
    } catch (error) {
      console.error("Visitor tracking error:", error);
      res.status(500).json({
        error: "Failed to process visitor data. Please try again later."
      });
    }
  }
);
