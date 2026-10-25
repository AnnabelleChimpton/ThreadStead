/**
 * "Copy them here", for the HTML editor: pictures a page brought in from the
 * resident's own verified site still loads from there. This copies them
 * into their page pictures (lib/media/page-pictures.ts) and says where each
 * one is now; the editor puts the new addresses in the code.
 *
 *   POST { urls, cap }  up to COPY_BATCH addresses at a time
 *
 * Only pictures on their own verified sites, fetched through the ring
 * checks' guarded fetcher, within the page pictures' bytes.
 */
import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { requireAction } from '@/lib/domain/users/capabilities'
import { rateLimitCheck } from '@/lib/server/http/rate-limit'
import { siteCheckFetcher } from '@/lib/rings/sites'
import { COPY_BATCH, copySitePictures, pagePictureBytes } from '@/lib/media/page-pictures'
import { processAndUploadMedia } from '@/lib/media/store-upload'
import { PAGE_ASSET_CONTEXT } from '@/lib/media/upload-context'

const Body = z.object({
  urls: z.array(z.string().url().max(2000)).min(1).max(COPY_BATCH),
  cap: z.string().min(1),
})

export default apiHandler({ methods: ['POST'], auth: 'user' }, async (req, res, { user }) => {
  res.setHeader('Cache-Control', 'no-store')
  const { urls, cap } = Body.parse(req.body)
  const resource = `user:${user.id}/media`
  const ok = await requireAction('write:media', (r) => r === resource)(cap).catch(() => null)
  if (!ok) throw new ApiError(403, 'Invalid capability')
  // One count per batch; the bytes are what hold a big page in
  if (!(await rateLimitCheck(req, res, 'page_pictures', user.id))) return

  const sites = await db.externalSite.findMany({ where: { userId: user.id, state: 'verified' }, select: { siteRef: true } })
  const result = await copySitePictures({
    urls,
    siteRefs: new Set(sites.map((s) => s.siteRef)),
    usedBytes: await pagePictureBytes(db, user.id),
    fetcher: siteCheckFetcher(getSiteBaseUrl()),
    store: async (bytes, type, name) => {
      const stored = await processAndUploadMedia(bytes, user.id, type, name, PAGE_ASSET_CONTEXT)
      await db.media.create({
        data: {
          userId: user.id,
          thumbnailUrl: stored.thumbnailUrl,
          mediumUrl: stored.mediumUrl,
          fullUrl: stored.fullUrl,
          originalName: name,
          fileSize: stored.metadata.fileSize,
          mimeType: type,
          mediaType: stored.mediaType,
          width: stored.metadata.width || null,
          height: stored.metadata.height || null,
          uploadContext: PAGE_ASSET_CONTEXT,
          isGalleryItem: false,
        },
      })
      return stored.fullUrl
    },
  })
  return res.status(200).json(result)
})
