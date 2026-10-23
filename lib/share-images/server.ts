/**
 * The link-preview pictures that read the database. Server-only. Previews
 * reach signed-out visitors, so only call these for a public profile (and,
 * for a post, a public post).
 */
import { db } from '@/lib/config/database/connection';
import { getSiteBaseUrl } from '@/lib/config/site-url';
import { mediumSize } from '@/lib/media/image';
import { postFirstImage, type PostBody } from '@/lib/templates/core/post-body';
import { SHARE_CARD, type PageImage } from '@/lib/share-images';

export interface Resident {
  userId: string;
  username: string;
  /** Display name, or @username */
  name: string;
  hasPixelHome: boolean;
  /** Their own picture; null when they use the default */
  avatarUrl?: string | null;
}

/**
 * Their yard's snapshot on the CDN, or, when it hasn't been drawn yet, the
 * route that draws it and waits (pages/api/home/[handle]/snapshot.ts).
 */
export async function homeShareImage(
  { userId, username, name }: Pick<Resident, 'userId' | 'username' | 'name'>,
  // The stored snapshotUrl when the caller already has the home's config
  known?: { snapshotUrl: string | null }
): Promise<PageImage> {
  const stored = known ?? (await db.userHomeConfig.findUnique({ where: { userId }, select: { snapshotUrl: true } }));
  let url = stored?.snapshotUrl;
  if (!url) {
    // Not drawn yet: start it now, and point previews at the route that waits for it
    const { scheduleHomeSnapshot } = await import('@/lib/pixel-homes/snapshot/service');
    void scheduleHomeSnapshot(userId);
    url = `${getSiteBaseUrl()}/api/home/${encodeURIComponent(username)}/snapshot`;
  }
  return { url, ...SHARE_CARD, alt: `${name}'s house and yard` };
}

/** A link to their page or a post of theirs: their house, else their own picture; null leaves the site's card. */
export async function residentShareImage(resident: Resident): Promise<PageImage | null> {
  if (resident.hasPixelHome) return homeShareImage(resident);
  return resident.avatarUrl ? { url: resident.avatarUrl, alt: `${resident.name}'s picture` } : null;
}

/** A post's own first picture, else its author's (residentShareImage). */
export async function postShareImage(post: PostBody, author: Resident): Promise<PageImage | null> {
  const own = postFirstImage(post);
  if (!own) return residentShareImage(author);
  // The editor puts an upload's medium in the post, and the upload knows its
  // shape, so a wide photo gets the large card
  const upload = await db.media.findFirst({
    where: { userId: author.userId, mediumUrl: own },
    select: { width: true, height: true },
  });
  return upload?.width && upload.height ? { url: own, ...mediumSize(upload.width, upload.height) } : { url: own };
}
