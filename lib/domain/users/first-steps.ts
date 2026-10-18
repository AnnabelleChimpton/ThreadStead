/**
 * The newcomer's first steps on the logged-in home, read from what they've
 * actually done. Ring membership lives on Ring Hub, so the client asks for it
 * separately (/api/threadrings/my-memberships).
 */
import { db } from '@/lib/config/database/connection';

export interface FirstSteps {
  house: boolean;
  yard: boolean;
  post: boolean;
  guestbook: boolean;
}

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

  const [config, decoration, post, signed] = await Promise.all([
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
  ]);

  return {
    house: housePicked(config),
    yard: !!decoration || hasTerrain(config?.terrain),
    post: !!post,
    guestbook: !!signed,
  };
}
