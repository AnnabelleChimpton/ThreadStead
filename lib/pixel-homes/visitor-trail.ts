/**
 * Who may appear in a pixel home's visitor trail
 * (pages/api/home/[handle]/visitors.ts, components/pixel-homes/VisitorTrail.tsx).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { visibleResidentWhere } from "@/lib/domain/users/profile-access";

/** "Show me in visitor trails" is on (no profile row counts as on, the default). */
export async function showsInTrails(db: Pick<PrismaClient, "profile">, userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { showInVisitorTrails: true } });
  return profile?.showInVisitorTrails ?? true;
}

/**
 * Visitors who may appear in this home's trail for this viewer: the setting
 * still on, a profile the viewer may see (visibility, blocks either way with
 * the viewer), and no block either way with the owner.
 */
export function trailVisitorWhere(homeOwnerId: string, viewerId: string | null | undefined): Prisma.UserWhereInput {
  return {
    AND: [
      { OR: [{ profile: { is: null } }, { profile: { is: { showInVisitorTrails: true } } }] },
      visibleResidentWhere(viewerId),
      { blocksCreated: { none: { blockedUserId: homeOwnerId } } },
      { blocksReceived: { none: { blockerId: homeOwnerId } } },
    ],
  };
}
