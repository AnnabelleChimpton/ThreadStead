/**
 * News about a resident's site in a ring, as `ring_site` notifications
 * (lib/rings/sites.ts, lib/rings/stops.ts). The actor is whoever did it: a
 * ring owner or moderator, the site's owner for a site waiting on a ring,
 * or the site's owner themself for what the weekly check found.
 */
import type { ExternalSite, PrismaClient } from '@prisma/client'

export type RingSiteEvent =
  /** To the owner: missed two checks; walks go to their pixel home. */
  | 'resting'
  /** To the owner: rested 30 days and left its rings. */
  | 'removed'
  /** To the owner: found again after resting. */
  | 'back'
  /** To the owner: a ring owner or moderator hid it from their ring. */
  | 'hidden'
  /** To the owner: a ring owner or moderator let it into their ring. */
  | 'approved'
  /** To a ring's owner and moderators: a site is waiting for a yes. */
  | 'waiting'

export async function notifyRingSite(
  db: Pick<PrismaClient, 'notification'>,
  {
    recipientId,
    actorId,
    event,
    site,
    ringSlug,
    ringName,
  }: {
    recipientId: string
    actorId: string
    event: RingSiteEvent
    site: Pick<ExternalSite, 'id' | 'url' | 'title'>
    ringSlug?: string
    ringName?: string | null
  }
) {
  try {
    await db.notification.create({
      data: {
        recipientId,
        actorId,
        type: 'ring_site',
        data: {
          event,
          siteId: site.id,
          siteUrl: site.url,
          siteTitle: site.title,
          ...(ringSlug && { threadRingSlug: ringSlug, threadRingName: ringName ?? ringSlug }),
        },
      },
    })
  } catch (error) {
    console.error('Ring site notification failed:', error)
  }
}
