import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'

/**
 * The og:image for a resident's public home: their yard's snapshot on the
 * CDN, or, when it hasn't been drawn yet, the route that draws it and waits
 * (pages/api/home/[handle]/snapshot.ts). Used by the home page and by their
 * profile and address, so a link to any of them previews as their house.
 * Only call it for a public profile: previews reach signed-out visitors.
 */
export async function homeShareImage(
  userId: string,
  handle: string,
  // The stored snapshotUrl when the caller already has the home's config
  known?: { snapshotUrl: string | null }
): Promise<string> {
  const stored = known ?? (await db.userHomeConfig.findUnique({ where: { userId }, select: { snapshotUrl: true } }))
  if (stored?.snapshotUrl) return stored.snapshotUrl
  // Not drawn yet: start it now, and point previews at the route that waits for it
  const { scheduleHomeSnapshot } = await import('@/lib/pixel-homes/snapshot/service')
  void scheduleHomeSnapshot(userId)
  return `${getSiteBaseUrl()}/api/home/${encodeURIComponent(handle)}/snapshot`
}
