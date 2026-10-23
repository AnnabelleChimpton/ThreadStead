import { apiHandler } from "@/lib/api/handler";
import { checkBluesky } from "@/lib/domain/bluesky/handle-links";

/** Settings → Bluesky → Check: has Bluesky switched them over yet? */
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "default" },
  async (_req, res, { user }) => res.json(await checkBluesky(user.id))
);
