import { apiHandler } from '@/lib/api/handler';
import { db } from '@/lib/config/database/connection';
import { SITE_NAME, SITE_TITLE } from '@/lib/config/site/constants';
import { limitIdentifier } from '@/lib/server/http/rate-limit';
import { keyFromPublicUrl, publicUrl } from '@/lib/storage/r2';
import { buildPageDownload } from '@/lib/domain/profile/page-download';

/**
 * GET /api/user/export/page: your page as a zip (Settings, Your page,
 * "Download my page"). Signed in, yours only, a few times an hour. What's in
 * it: lib/domain/profile/page-download.ts.
 */
export default apiHandler({ methods: ['GET'], auth: 'user' }, async (_req, res, { user }) => {
  // Its own count (pictures make it heavier than a save), at the uploads rate
  const allowed = await limitIdentifier(
    res,
    `page-download:user:${user.id}`,
    'uploads',
    (seconds) => {
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      return `You've downloaded your page a lot this hour. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    }
  );
  if (!allowed) return;

  const [profile, handle] = await Promise.all([
    db.profile.findUnique({
      where: { userId: user.id },
      select: { templateMode: true, customTemplate: true, customCSS: true },
    }),
    db.handle.findFirst({ where: { userId: user.id, host: SITE_NAME }, select: { handle: true } }),
  ]);
  const name = handle?.handle ?? 'my';

  const download = await buildPageDownload(
    {
      userId: user.id,
      handle: name,
      templateMode: profile?.templateMode ?? null,
      customTemplate: profile?.customTemplate ?? null,
      customCSS: profile?.customCSS ?? null,
    },
    { storage: { keyFromPublicUrl, publicUrl }, siteName: SITE_TITLE }
  );

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^A-Za-z0-9_-]/g, '')}-page.zip"`);
  res.setHeader('Content-Length', download.zip.length.toString());
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(download.zip);
});

// The zip can reach the 50 MB cap; Next would otherwise warn past 4 MB
export const config = { api: { responseLimit: '60mb' } };
