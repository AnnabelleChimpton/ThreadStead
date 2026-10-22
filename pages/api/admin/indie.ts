import type { Prisma } from "@prisma/client";
import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { escapeLike, parseIntParam } from "@/lib/search/query";
import { liftOptOut, optOutKey, setHidden } from "@/lib/indie-index/actions";
import { doorwayTotals } from "@/lib/rings/counts";

const TIERS = ["resident", "vouched", "community", "pool", "candidate"] as const;
const STATUSES = ["active", "stale", "dead", "hidden"] as const;

/**
 * GET  /api/admin/indie?q&tier&status&offset   overview: nightly runs, counts, opt-outs, a page of sites
 * POST /api/admin/indie { action: 'hide' | 'show', siteId }
 * POST /api/admin/indie { action: 'opt-out', address }
 * POST /api/admin/indie { action: 'lift-opt-out', key }
 */
export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    if (req.method === "POST") {
      const { action, siteId, address, key } = (req.body ?? {}) as Record<string, unknown>;
      if ((action === "hide" || action === "show") && typeof siteId === "string") {
        await setHidden(db, siteId, action === "hide");
        return res.json({ ok: true });
      }
      if (action === "opt-out" && typeof address === "string") return res.json(await optOutKey(db, address));
      if (action === "lift-opt-out" && typeof key === "string") {
        await liftOptOut(db, key);
        return res.json({ ok: true });
      }
      return res.status(400).json({ error: "Unknown action" });
    }

    const offset = parseIntParam(req.query.offset, "offset", { fallback: 0, min: 0, max: 100000 });
    const q = String(req.query.q || "").trim().toLowerCase();
    const tier = TIERS.find((t) => t === req.query.tier);
    const status = STATUSES.find((s) => s === req.query.status);
    const where: Prisma.SiteWhereInput = {
      ...(q ? { key: { contains: escapeLike(q) } } : {}),
      ...(tier ? { tier } : {}),
      ...(status ? { status } : {}),
    };

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [runs, counts, optOuts, sites, total, ringSites, doorways] = await Promise.all([
      db.indexRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
      db.site.groupBy({ by: ["tier", "status"], _count: true }),
      db.siteOptOut.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.site.findMany({
        where,
        orderBy: [{ residentSignals: "desc" }, { key: "asc" }],
        skip: offset,
        take: 50,
        select: {
          id: true, key: true, url: true, title: true, tier: true, status: true, source: true, residentSignals: true,
          vouchCount: true, failCount: true, lastError: true, lastOkAt: true, lastPostAt: true, feedUrl: true,
        },
      }),
      db.site.count({ where }),
      db.externalSite.groupBy({ by: ["state"], _count: true }),
      doorwayTotals(db, monthStart),
    ]);

    return res.json({
      runs,
      counts: counts.map((c) => ({ tier: c.tier, status: c.status, n: c._count })),
      optOuts,
      sites,
      total,
      nextOffset: offset + sites.length < total ? offset + sites.length : null,
      // Residents' own sites as ring stops (lib/rings), and their strips' clicks this month
      ringSites: Object.fromEntries(ringSites.map((r) => [r.state, r._count])),
      doorways,
    });
  }
);
