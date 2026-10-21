import { z } from 'zod';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

const body = z.object({ autoplay: z.boolean() });

/**
 * A signed-in visitor's own choice about other people's profile music:
 * whether it may start on its own. The browser remembers it too
 * (lib/audio/music-preferences.ts); this keeps it with the account.
 */
export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'user', rateLimit: 'profile_metadata' },
  async (req, res, { user: me }) => {
    if (req.method === 'GET') {
      const profile = await db.profile.findUnique({
        where: { userId: me.id },
        select: { playProfileMusicAutomatically: true },
      });
      return res.status(200).json({ autoplay: profile?.playProfileMusicAutomatically ?? true });
    }

    const { autoplay } = body.parse(req.body);
    await db.profile.upsert({
      where: { userId: me.id },
      update: { playProfileMusicAutomatically: autoplay },
      create: { userId: me.id, playProfileMusicAutomatically: autoplay },
    });
    return res.status(200).json({ autoplay });
  }
);
