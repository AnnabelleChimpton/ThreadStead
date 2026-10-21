import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { SITE_NAME } from "@/lib/config/site/constants";
import { getArrival } from "@/lib/pixel-homes/street";

/**
 * GET /api/user/arrival: the signed-in resident's house number, street and
 * nearest neighbours, for the end of signup (SignupFinaleAnimation). 404
 * until they have a pixel home.
 */
export default apiHandler({ methods: ["GET"], auth: "user" }, async (_req, res, { user }) => {
  const arrival = await getArrival(db, { userId: user.id, host: SITE_NAME });
  res.setHeader("Cache-Control", "private, no-store");
  if (!arrival) return res.status(404).json({ error: "No house yet" });
  // Their own house is drawn fresh, not from a yard picture, so it can be set down into the lot
  const homes = arrival.homes.map((home) => (home.userId === user.id ? { ...home, snapshotCardUrl: null } : home));
  return res.json({ ...arrival, homes });
});
