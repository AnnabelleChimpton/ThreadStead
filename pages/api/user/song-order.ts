import { z } from 'zod';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

const body = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(500) });

/**
 * The order of your songs in Settings → Music (MIDI plan follow-up): the
 * whole list, top first. Only your own songs, and all of them, so the
 * order can't half-apply.
 */
export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'profile_metadata' },
  async (req, res, { user: me }) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Send the songs in order, as ids' });
    const { ids } = parsed.data;

    const songs = await db.media.findMany({
      where: { userId: me.id, mediaType: 'midi' },
      select: { id: true },
    });
    const yours = new Set(songs.map((s) => s.id));
    if (new Set(ids).size !== ids.length || ids.length !== yours.size || !ids.every((id) => yours.has(id))) {
      return res.status(400).json({ error: 'That list doesn’t match your songs. Reload and try again.' });
    }

    await db.$transaction(
      ids.map((id, index) => db.media.update({ where: { id }, data: { songOrder: index } }))
    );
    return res.status(200).json({ ids });
  }
);
