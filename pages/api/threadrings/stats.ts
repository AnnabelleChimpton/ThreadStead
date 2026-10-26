import { apiHandler } from "@/lib/api/handler";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { cached } from "@/lib/api/ringhub/ringhub-cache";

/** Ring Hub's network-wide counts (rings, actors, posts). */
export default apiHandler({ methods: ["GET"], auth: "none" }, async (_req, res) => {
  const client = getPublicRingHubClient();

  try {
    // The ring page's loader keeps the same key (lib/rings/page-data.ts)
    return res.json(await cached("ring-hub-stats", 30_000, 5 * 60_000, () => client.getStats()));
  } catch (error) {
    console.error("Error fetching Ring Hub stats:", error);
    return res.status(503).json({ error: "hub_unavailable", degraded: true });
  }
});
