import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";


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

  // Check profile visibility and enforce access control
  const visibility = u.profile?.visibility || 'public';
  const profileOwnerId = u.id;

  // Get current viewer (if logged in)
  const viewer = await getSessionUser(req);
  const viewerId = viewer?.id;

  // Public profiles are accessible to everyone
  if (visibility !== 'public') {
    // If not logged in and profile is not public, deny access
    if (!viewerId) {
      return res.status(404).json({ error: "not found" });
    }

    // Profile owner can always view their own profile
    if (viewerId !== profileOwnerId) {
      // Check relationship for non-public profiles
      if (visibility === 'private') {
        // Private profiles are only visible to the owner
        return res.status(404).json({ error: "not found" });
      }

      // Check follow relationships for 'followers' and 'friends' visibility
      const [viewerFollowsOwner, ownerFollowsViewer] = await Promise.all([
        db.follow.findUnique({
          where: {
            followerId_followeeId: {
              followerId: viewerId,
              followeeId: profileOwnerId
            }
          }
        }),
        db.follow.findUnique({
          where: {
            followerId_followeeId: {
              followerId: profileOwnerId,
              followeeId: viewerId
            }
          }
        })
      ]);

      const isFollower = viewerFollowsOwner?.status === 'accepted';
      const isFriend = isFollower && ownerFollowsViewer?.status === 'accepted';

      if (visibility === 'followers' && !isFollower) {
        return res.status(404).json({ error: "not found" });
      }

      if (visibility === 'friends' && !isFriend) {
        return res.status(404).json({ error: "not found" });
      }
    }
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
    plugins: u.installs
      .filter(i => i.enabled)
      .map(i => ({ id: i.pluginId, mode: i.mode, label: undefined })),
  };
  
  return res.json(response);
}
