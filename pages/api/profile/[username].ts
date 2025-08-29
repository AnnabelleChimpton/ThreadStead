import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { SITE_NAME } from "@/lib/site-config";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  
  return res.json({
    did: u.did,
    userId: u.id,                       // <-- add this
    username,
    primaryHandle: u.primaryHandle ?? null, // optional, handy later
    profile: u.profile,
    profileMidi,
    plugins: u.installs
      .filter(i => i.enabled)
      .map(i => ({ id: i.pluginId, mode: i.mode, label: undefined })),
  });
}
