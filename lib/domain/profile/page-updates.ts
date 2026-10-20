/**
 * When someone changes how their page looks.
 *
 * Profile.pageUpdatedAt is the residents list's "Recently updated". It moves
 * when the owner's save changes the page's look: their HTML, their CSS, site
 * styles on or off, or the layout. Every route that writes those for the
 * owner (the template and CSS saves, Settings > Your page's themes and
 * knobs, the layout switch in /api/profile/update) asks changesPageLook and
 * spreads pageUpdatedNow() into its write. A moderator's reset
 * (lib/domain/users/page-reset.ts) leaves it alone: that isn't the person
 * updating their page. Profile.updatedAt can't stand in: any profile edit
 * (a bio, a status) moves it.
 *
 * A PageUpdate row is the opt-in feed item, "<Name> updated their page". A
 * save writes one only when the owner ticked "Share this update in the
 * feed", and only when the save changed the page. One per person per UTC
 * day: sharing again the same day moves the row's time up instead.
 */
import { Prisma } from '@prisma/client';
import { db } from '@/lib/config/database/connection';
import { layoutOf, siteStylesOn } from '@/lib/domain/profile/layout';

/** The stored fields a page's look is made of */
export interface PageLook {
  customTemplate?: string | null;
  customCSS?: string | null;
  cssMode?: string | null;
  templateMode?: string | null;
}

export const PAGE_LOOK_SELECT = {
  customTemplate: true,
  customCSS: true,
  cssMode: true,
  templateMode: true,
} as const;

const text = (value: string | null | undefined) => (value ?? '').trim();

/**
 * Whether writing `next` (only the fields the save sets) changes the look of
 * a page that is `before` now (null: no profile row yet). Stored values that
 * mean the same thing ('default'/'enhanced', 'inherit'/'override', null/'')
 * count as no change.
 */
export function changesPageLook(before: PageLook | null | undefined, next: PageLook): boolean {
  const was = before ?? {};
  if (next.customTemplate !== undefined && text(next.customTemplate) !== text(was.customTemplate)) return true;
  if (next.customCSS !== undefined && text(next.customCSS) !== text(was.customCSS)) return true;
  if (next.cssMode !== undefined && siteStylesOn(next.cssMode) !== siteStylesOn(was.cssMode)) return true;
  if (next.templateMode !== undefined && layoutOf(next.templateMode) !== layoutOf(was.templateMode)) return true;
  return false;
}

/** Spread into a Profile write that changed the page's look */
export function pageUpdatedNow(now = new Date()): { pageUpdatedAt: Date } {
  return { pageUpdatedAt: now };
}

/** The UTC calendar day `now` falls on, as PageUpdate.day stores it */
export function utcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Put "<Name> updated their page" in the feed, or move today's one up.
 * Call it after the save has been written. Never throws: the save already
 * worked, and a missing feed item mustn't turn it into an error.
 */
export async function sharePageUpdate(userId: string, now = new Date()): Promise<boolean> {
  const day = utcDay(now);
  try {
    await db.pageUpdate.upsert({
      where: { userId_day: { userId, day } },
      update: { sharedAt: now },
      create: { userId, day, sharedAt: now },
    });
    return true;
  } catch (error) {
    // Two shares raced on the same day and the other one made the row
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      try {
        await db.pageUpdate.update({ where: { userId_day: { userId, day } }, data: { sharedAt: now } });
        return true;
      } catch {
        return false;
      }
    }
    console.error('Failed to share page update:', error);
    return false;
  }
}

/**
 * How long after a save the HTML editor's follow-up share request
 * (/api/user/page-update) still counts. That editor's save request is built
 * by its page, so the share comes in a second request just after it.
 */
export const SHARE_AFTER_SAVE_MS = 10 * 60 * 1000;

/**
 * Share the owner's page update if their page changed in the last few
 * minutes; otherwise there's nothing new to share.
 */
export async function shareRecentPageUpdate(
  userId: string,
  now = new Date()
): Promise<'shared' | 'nothing-new' | 'failed'> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { pageUpdatedAt: true } });
  const at = profile?.pageUpdatedAt;
  if (!at || now.getTime() - at.getTime() > SHARE_AFTER_SAVE_MS) return 'nothing-new';
  return (await sharePageUpdate(userId, now)) ? 'shared' : 'failed';
}
