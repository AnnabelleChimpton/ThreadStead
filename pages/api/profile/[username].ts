import { apiHandler } from "@/lib/api/handler";
import { loadResidentPage } from "@/lib/domain/profile/load-resident-page";

// A resident's profile as this viewer may see it (lib/domain/profile/load-resident-page.ts).
// The compiled page goes out as this viewer's: their side of <IfOwner>, no
// warnings that quote the source, none of the other stored copies.
export default apiHandler(
  { methods: ['GET'], auth: 'optional' },
  async (req, res, { user: viewer }) => {
    const username = String(req.query.username || "");
    if (!username) return res.status(400).json({ error: "username required" });

    const lookup = await loadResidentPage(username, viewer ?? null);
    if (lookup.status === 'not-found') return res.status(404).json({ error: "not found" });
    if (lookup.status === 'private') {
      const { status: _status, ...hidden } = lookup;
      return res.status(403).json({ error: "private_profile", ...hidden });
    }

    const { page, profile, ...resident } = lookup.resident;
    return res.json({ ...resident, profile: profile && { ...profile, compiledTemplate: page } });
  }
);
