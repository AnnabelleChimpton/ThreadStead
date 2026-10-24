// What the editor's preview renders the owner's page with: the same data the
// live page's components get (lib/domain/profile/resident-data.ts), as the
// owner sees it or, with ?as=visitor, as a signed-out visitor does. Every
// list is loaded, since a draft may start using any of them; and the admin's
// default CSS, which a page without its own wears.
import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { loadResidentPage } from "@/lib/domain/profile/load-resident-page";
import { musicFor, residentDataFor } from "@/lib/domain/profile/resident-data";

export default apiHandler(
  { methods: ['GET'], auth: 'user' },
  async (req, res, { user }) => {
    const username = String(req.query.username || "");
    const lookup = await loadResidentPage(username, user);
    if (lookup.status === 'not-found') return res.status(404).json({ error: "not found" });
    // Only your own page
    if (lookup.status !== 'ok' || lookup.resident.userId !== user.id) return res.status(403).json({ error: "Access denied" });

    const resident = lookup.resident;
    const viewer = req.query.as === 'visitor' ? null : user;
    const [residentData, adminDefault] = await Promise.all([
      musicFor(resident, viewer).then((profileMidi) => residentDataFor(resident, viewer, { reads: 'all', profileMidi })),
      db.siteConfig.findUnique({ where: { key: 'default_profile_css' }, select: { value: true } }).catch(() => null),
    ]);
    return res.json({ residentData, adminDefaultCss: adminDefault?.value || "" });
  }
);
