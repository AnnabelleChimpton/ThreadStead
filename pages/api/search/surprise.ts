import { apiHandler } from "@/lib/api/handler";
import { getThreadRingSystem } from "@/lib/api/ringhub/ringhub-middleware";
import { surprisePick, type SurprisePick } from "@/lib/search/discover";

const KINDS: SurprisePick["kind"][] = ["home", "ring", "site"];

/**
 * GET /api/search/surprise?kind=home|ring|site
 *
 * One random home, ring or indie site for the Surprise Me preview card on
 * /search — shown before anyone leaves the site.
 */
export default apiHandler(
  { methods: ["GET"], auth: "optional", rateLimit: "search" },
  async (req, res, { user: viewer }) => {
    const raw = String(req.query.kind || "");
    const kind = KINDS.find((k) => k === raw);
    if (raw && !kind) {
      return res.status(400).json({ error: `Invalid kind "${raw}" — expected one of: ${KINDS.join(", ")}` });
    }
    const pick = await surprisePick(viewer?.id ?? null, getThreadRingSystem(viewer), kind);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ pick });
  }
);
