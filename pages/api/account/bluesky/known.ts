import { apiHandler } from "@/lib/api/handler";
import { knownPeopleHere } from "@/lib/domain/bluesky/known-follows";

/**
 * Settings → Bluesky, once connected: residents you already follow on
 * Bluesky (lib/domain/bluesky/known-follows.ts). An empty list when there
 * are none, or Bluesky didn't answer.
 */
export default apiHandler(
  { methods: ["GET"], auth: "user", rateLimit: "default" },
  async (_req, res, { user }) => res.json({ people: await knownPeopleHere(user.id) })
);
