/**
 * The newcomer's first steps on the logged-in home, read from what they've
 * actually done. Ring membership lives on Ring Hub, so the client asks for it
 * separately (/api/threadrings/my-memberships).
 */
import { db } from '@/lib/config/database/connection';
import { layoutOf } from '@/lib/domain/profile/layout';
import { visibleResidentWhere } from '@/lib/domain/users/profile-access';

export interface FirstSteps {
  house: boolean;
  yard: boolean;
  post: boolean;
  guestbook: boolean;
  /** Made their page their own: a theme, CSS, their own HTML or widgets */
  page: boolean;
  /**
   * Whose guestbook "Sign a neighbor's guestbook" opens: whoever posted most
   * recently and is around to see it (null: the street instead). Was the
   * street, which left a newcomer at Pine Street #1 (signup audit #8).
   */
  neighbor?: string | null;
}

/** The username of the resident who posted most recently, other than this one */
async function recentNeighbor(userId: string): Promise<string | null> {
  const post = await db.post.findFirst({
    where: { authorId: { not: userId }, visibility: 'public', author: visibleResidentWhere(userId) },
    orderBy: { createdAt: 'desc' },
    select: { author: { select: { primaryHandle: true } } },
  });
  return post?.author.primaryHandle?.split('@')[0] ?? null;
}

// Saves the person makes from Settings > Your page and the two editors each
// put the look they replace into History first. Signup's theme doesn't (the
// page has no look yet to keep), so one of these means they've changed their
// page since signup. Moderator resets and the layout migration aren't theirs.
export const OWN_PAGE_SAVE_TRIGGERS = ['css-save', 'template-save', 'reset'];

// Shown to accounts this young; older residents don't get a newcomer list
export const FIRST_STEPS_MAX_AGE_DAYS = 60;

// Signup creates a random house (createdAt === updatedAt); any later save
// means they picked one.
const PICKED_AFTER_MS = 1_000;

export function housePicked(config: { createdAt: Date; updatedAt: Date } | null): boolean {
  return !!config && config.updatedAt.getTime() - config.createdAt.getTime() > PICKED_AFTER_MS;
}

function hasTerrain(terrain: unknown): boolean {
  return !!terrain && typeof terrain === 'object' && Object.keys(terrain as object).length > 0;
}

/** null when the account is too old for the list. */
export async function getFirstSteps(userId: string, now: Date = new Date()): Promise<FirstSteps | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (!user) return null;
  const ageDays = (now.getTime() - user.createdAt.getTime()) / 86_400_000;
  if (ageDays > FIRST_STEPS_MAX_AGE_DAYS) return null;

  const [config, decoration, post, signed, profile, pageSave, neighbor] = await Promise.all([
    db.userHomeConfig.findUnique({
      where: { userId },
      select: { createdAt: true, updatedAt: true, terrain: true },
    }),
    db.userHomeDecoration.findFirst({ where: { userId }, select: { id: true } }),
    db.post.findFirst({ where: { authorId: userId }, select: { id: true } }),
    db.guestbookEntry.findFirst({
      where: { authorId: userId, profileOwner: { not: userId } },
      select: { id: true },
    }),
    db.profile.findUnique({ where: { userId }, select: { templateMode: true, widgetSlot: true } }),
    db.profileTemplateRevision.findFirst({
      where: { userId, trigger: { in: OWN_PAGE_SAVE_TRIGGERS } },
      select: { id: true },
    }),
    recentNeighbor(userId).catch(() => null),
  ]);

  return {
    house: housePicked(config),
    yard: !!decoration || hasTerrain(config?.terrain),
    post: !!post,
    guestbook: !!signed,
    page: !!pageSave || layoutOf(profile?.templateMode) === 'html' || profile?.widgetSlot != null,
    neighbor,
  };
}
