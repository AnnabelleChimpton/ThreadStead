/**
 * "<Name> updated their page" items for the feed (PageUpdate rows, written
 * only when the owner ticks "Share this update in the feed" on a save; see
 * lib/domain/profile/page-updates.ts).
 *
 * Who may see one goes through the person, with the same filters as the
 * lists of people (lib/domain/users/profile-access.ts):
 *   - Recent: public pages only (neighborWhere), as Recent only has public
 *     posts.
 *   - Following: the people the viewer follows, by their profile's
 *     visibility (visibleResidentWhere), so a followers-only page shows to
 *     followers and a private one to nobody.
 * Both leave out suspended and banned accounts and anyone on either side of
 * a block with the viewer.
 *
 * The posts queries are untouched. Each page of posts brings the page
 * updates from the stretch of time it covers: newer than the previous page's
 * last post (`before`), and no older than this page's last post while more
 * posts follow. The client merges the two by time.
 */
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/config/database/connection';
import { SITE_NAME } from '@/lib/config/site/constants';
import { neighborWhere, visibleResidentWhere } from '@/lib/domain/users/profile-access';

export type FeedPageUpdate = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  sharedAt: string;
  /** Only a public page gets a preview: it shows what a signed-out visitor sees */
  publicPage: boolean;
};

export type PageUpdateScope = { kind: 'everyone' } | { kind: 'following'; followeeIds: string[] };

export type PageUpdateWindow = {
  /** Strictly older than this (the previous page's last post) */
  before?: Date;
  /** This old or newer (this page's last post, while more posts follow) */
  notBefore?: Date;
};

/** At most this many page updates come with one page of posts */
export const PAGE_UPDATES_PER_PAGE = 20;

/** The stretch of time a page of posts covers (see the top of this file) */
export function pageUpdateWindow(
  before: Date | null | undefined,
  posts: Array<{ createdAt: Date | string }>,
  hasMore: boolean
): PageUpdateWindow {
  const last = posts[posts.length - 1];
  return {
    ...(before && { before }),
    ...(hasMore && last && { notBefore: new Date(last.createdAt) }),
  };
}

/** Who this viewer may see page updates from, in this feed */
export function pageUpdatePeopleWhere(viewerId: string | null | undefined, scope: PageUpdateScope): Prisma.UserWhereInput {
  if (scope.kind === 'everyone') return neighborWhere(viewerId);
  return {
    id: { in: scope.followeeIds },
    handles: { some: { host: SITE_NAME } },
    AND: [visibleResidentWhere(viewerId)],
  };
}

export function pageUpdateWhere(
  viewerId: string | null | undefined,
  scope: PageUpdateScope,
  window: PageUpdateWindow
): Prisma.PageUpdateWhereInput {
  const sharedAt: Prisma.DateTimeFilter = {};
  if (window.before) sharedAt.lt = window.before;
  if (window.notBefore) sharedAt.gte = window.notBefore;
  return {
    user: pageUpdatePeopleWhere(viewerId, scope),
    ...(Object.keys(sharedAt).length > 0 && { sharedAt }),
  };
}

export async function loadPageUpdates(
  viewerId: string | null | undefined,
  scope: PageUpdateScope,
  window: PageUpdateWindow
): Promise<FeedPageUpdate[]> {
  if (scope.kind === 'following' && scope.followeeIds.length === 0) return [];
  const rows = await db.pageUpdate.findMany({
    where: pageUpdateWhere(viewerId, scope, window),
    orderBy: [{ sharedAt: 'desc' }, { id: 'desc' }],
    take: PAGE_UPDATES_PER_PAGE,
    select: {
      id: true,
      userId: true,
      sharedAt: true,
      user: {
        select: {
          handles: { where: { host: SITE_NAME }, take: 1, select: { handle: true } },
          profile: { select: { displayName: true, avatarUrl: true, visibility: true } },
        },
      },
    },
  });
  return rows.flatMap((row) => {
    const username = row.user.handles[0]?.handle;
    if (!username) return [];
    return [{
      id: row.id,
      userId: row.userId,
      username,
      displayName: row.user.profile?.displayName || null,
      avatarUrl: row.user.profile?.avatarUrl || null,
      sharedAt: row.sharedAt.toISOString(),
      publicPage: (row.user.profile?.visibility ?? 'public') === 'public',
    }];
  });
}

/** `before` from a query string: an ISO time, or nothing */
export function parseBefore(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
