import { db } from "@/lib/config/database/connection";
import { requireAction } from "@/lib/domain/users/capabilities";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'profile_metadata' },
  async (req, res, { user: me }) => {
    const { midiId, autoplay, loop, cap } = req.body;

    if (!cap) {
      return res.status(401).json({ error: "Capability required" });
    }

    const resource = `user:${me.id}/profile`;
    const ok = await requireAction("write:profile", (resStr) => resStr === resource)(cap).catch(() => null);
    if (!ok) {
      return res.status(403).json({ error: "Invalid capability" });
    }

    try {
      // Verify the MIDI file exists and belongs to the user
      if (midiId) {
        const midiFile = await db.media.findUnique({
          where: { id: midiId }
        });

        if (!midiFile) {
          return res.status(404).json({ error: "MIDI file not found" });
        }

        if (midiFile.userId !== me.id) {
          return res.status(403).json({ error: "Not authorized to use this MIDI file" });
        }

        if (midiFile.mediaType !== 'midi') {
          return res.status(400).json({ error: "Selected file is not a MIDI file" });
        }
      }

      // Update or create the profile with MIDI settings
      const profile = await db.profile.upsert({
        where: { userId: me.id },
        update: {
          profileMidiId: midiId || null,
          midiAutoplay: autoplay || false,
          midiLoop: loop || false,
        },
        create: {
          userId: me.id,
          profileMidiId: midiId || null,
          midiAutoplay: autoplay || false,
          midiLoop: loop || false,
        }
      });

      return res.status(200).json({ 
        success: true,
        profileMidiId: profile.profileMidiId,
        midiAutoplay: profile.midiAutoplay,
        midiLoop: profile.midiLoop
      });

    } catch (error) {
      console.error("Error updating profile MIDI:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
