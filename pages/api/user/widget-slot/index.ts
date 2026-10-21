// The widget slot on your own profile (lib/domain/profile/widget-slot).
// GET reads it back for the picker, POST compiles and saves it, DELETE
// empties it. Only ever the signed-in resident's own profile: there is no
// username to point at someone else's.
import { Prisma } from '@prisma/client';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { SITE_NAME } from '@/lib/config/site/constants';
import { WIDGET_TYPES, sampleWidget, widgetsToSource, type WidgetType } from '@/lib/domain/profile/widget-slot/catalog';
import {
  compileWidgetSlot,
  islandsPlaySong,
  slotInputFromBody,
  storedSlot,
  type StoredWidgetSlot,
} from '@/lib/domain/profile/widget-slot/compile';

type Preview = { staticHTML: string; islands: StoredWidgetSlot['islands'] };

// The gallery's previews only depend on the catalog, so compile them once.
let galleryPreviews: Partial<Record<WidgetType, Preview>> | null = null;
function gallery(): Partial<Record<WidgetType, Preview>> {
  if (galleryPreviews) return galleryPreviews;
  const out: Partial<Record<WidgetType, Preview>> = {};
  for (const type of WIDGET_TYPES) {
    const result = compileWidgetSlot(widgetsToSource([sampleWidget(type)]));
    if (result.ok) out[type] = { staticHTML: result.staticHTML, islands: result.islands };
  }
  galleryPreviews = out;
  return out;
}

export default apiHandler(
  { methods: ['GET', 'POST', 'DELETE'], auth: 'user', rateLimit: 'template_editing' },
  async (req, res, { user }) => {
    if (req.method === 'GET') {
      const [profile, handle] = await Promise.all([
        db.profile.findUnique({
          where: { userId: user.id },
          select: { widgetSlot: true, displayName: true, avatarUrl: true, profileMidiId: true, midiLoop: true },
        }),
        db.handle.findFirst({ where: { userId: user.id, host: SITE_NAME }, select: { handle: true } }),
      ]);
      const song = profile?.profileMidiId
        ? await db.media.findUnique({ where: { id: profile.profileMidiId }, select: { id: true, title: true, caption: true } })
        : null;
      const slot = storedSlot(profile?.widgetSlot);
      const handleName = handle?.handle ?? user.primaryHandle?.split('@')[0] ?? '';

      return res.status(200).json({
        slot: slot ? { widgets: slot.widgets, source: slot.source } : null,
        resident: {
          id: user.id,
          handle: handleName,
          displayName: profile?.displayName || handleName,
          avatarUrl: profile?.avatarUrl || '/assets/default-avatar.gif',
          // Never autoplay inside the picker
          song: song
            ? { url: `/api/media/serve/${song.id}`, title: song.title || 'Background Music', credit: song.caption || null, autoplay: false, loop: profile?.midiLoop ?? false }
            : null,
        },
        previews: gallery(),
      });
    }

    if (req.method === 'DELETE') {
      await db.profile.updateMany({ where: { userId: user.id }, data: { widgetSlot: Prisma.DbNull } });
      return res.status(200).json({ success: true });
    }

    const input = slotInputFromBody(req.body);
    if (!input.ok) return res.status(input.status).json({ error: input.error });

    const compiled = compileWidgetSlot(input.source);
    if (!compiled.ok) {
      return res.status(compiled.status).json({ error: compiled.error, details: compiled.details });
    }

    const stored: StoredWidgetSlot = {
      version: 1,
      widgets: input.widgets,
      source: input.source,
      staticHTML: compiled.staticHTML,
      islands: compiled.islands,
      compiledAt: new Date().toISOString(),
    };
    const widgetSlot = JSON.parse(JSON.stringify(stored)) as Prisma.InputJsonValue;
    await db.profile.upsert({
      where: { userId: user.id },
      update: { widgetSlot },
      create: { userId: user.id, widgetSlot },
    });

    // Like a page save: say what didn't make it, never just "saved"
    return res.status(200).json({
      slot: { widgets: stored.widgets, source: stored.source },
      compiled: { staticHTML: stored.staticHTML, islands: stored.islands, playsSong: islandsPlaySong(stored.islands) },
      strippedComponents: compiled.strippedComponents,
      warnings: compiled.warnings,
    });
  }
);
