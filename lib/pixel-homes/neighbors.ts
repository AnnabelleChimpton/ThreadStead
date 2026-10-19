import type { PrismaClient } from "@prisma/client";
import { visibleResidentWhere } from "@/lib/domain/users/profile-access";

export interface HomeNeighbor {
  username: string;
  displayName: string | null;
}

export interface HomeNeighbors {
  previous: HomeNeighbor | null;
  next: HomeNeighbor | null;
}

/**
 * The houses on either side of this one, for "next door" links.
 *
 * Neighbors are fixed by when people moved in (join order), so the house
 * next door doesn't change whenever someone saves their yard. Only homes the
 * viewer could visit count: local residents with a pixel home whose profile
 * the viewer may see, with blocks either way left out.
 */
export async function getHomeNeighbors(
  db: Pick<PrismaClient, "user">,
  home: { id: string; createdAt: Date },
  { viewerId, host }: { viewerId: string | null | undefined; host: string }
): Promise<HomeNeighbors> {
  const visitable = {
    id: { not: home.id },
    homeConfig: { isNot: null },
    handles: { some: { host } },
    ...visibleResidentWhere(viewerId),
  };
  const select = {
    handles: { where: { host }, select: { handle: true }, take: 1 },
    profile: { select: { displayName: true } },
  } as const;

  const [before, after] = await Promise.all([
    db.user.findFirst({
      where: { ...visitable, createdAt: { lt: home.createdAt } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select,
    }),
    db.user.findFirst({
      where: { ...visitable, createdAt: { gt: home.createdAt } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select,
    }),
  ]);

  const toNeighbor = (u: typeof before): HomeNeighbor | null =>
    u && u.handles[0] ? { username: u.handles[0].handle, displayName: u.profile?.displayName ?? null } : null;

  return { previous: toNeighbor(before), next: toNeighbor(after) };
}
