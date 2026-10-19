import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";
import { hasPixelHome, residentAccess } from "@/lib/domain/users/profile-access";


export default apiHandler(
  { methods: ['GET'], auth: 'optional' },
  async (req, res, { user: viewer }) => {
    const username = String(req.query.username || "");
    if (!username) return res.status(400).json({ error: "username required" });

    // assuming local host for now
    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: {
        user: {
          include: {
            profile: true,
            installs: true,
          },
        },
      },
    });

    if (!handle) return res.status(404).json({ error: "not found" });

    const u = handle.user;

    // Visibility and blocks (either way), the same rules as the pixel home.
    // A block reads as "private" so nobody learns they were blocked.
    const access = await residentAccess(viewer, u.id, u.profile?.visibility ?? null);
    // A suspended or banned account is gone, the same as no account.
    if (!access.visible && access.suspended) return res.status(404).json({ error: "not found" });
    if (!access.visible) {
      return res.status(403).json({
        error: "private_profile",
        visibility: access.visibility,
        username,
        displayName: u.profile?.displayName || username,
        avatarUrl: u.profile?.avatarUrl || null
      });
    }

    // Get profile MIDI if set
    let profileMidi = null;
    if (u.profile?.profileMidiId) {
      const midiFile = await db.media.findUnique({
        where: { id: u.profile.profileMidiId },
        select: {
          id: true,
          title: true,
          fullUrl: true,
        }
      });
      if (midiFile) {
        profileMidi = {
          url: `/api/media/serve/${midiFile.id}`, // Use proxy to avoid CORS issues
          title: midiFile.title || 'Background Music',
          autoplay: u.profile.midiAutoplay || false,
          loop: u.profile.midiLoop || false,
        };
      }
    }
  
    const response = {
      did: u.did,
      userId: u.id,                       // <-- add this
      username,
      primaryHandle: u.primaryHandle ?? null, // optional, handy later
      profile: u.profile,
      profileMidi,
      // Past the access check above, so the viewer may see the house too
      hasPixelHome: await hasPixelHome(u.id),
      plugins: u.installs
        .filter(i => i.enabled)
        .map(i => ({ id: i.pluginId, mode: i.mode, label: undefined })),
    };
  
    return res.json(response);
  }
);
