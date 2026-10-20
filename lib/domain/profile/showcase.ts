/**
 * The showcase (/build/showcase): pages people wrote in their own HTML and
 * share the source of, newest compiled first.
 *
 * A page is listed when it's a local resident's own HTML page
 * (templateMode 'advanced', see layout.ts) with some template in it, the
 * owner has "Visitors can view my source" on, and the profile is public.
 * Only public ones, because each card shows the page in a signed-out
 * preview (LivePagePreview), which can't show a followers-only page. On top
 * of that, the usual list rules apply (visibleResidentWhere): no suspended
 * or banned accounts, and nobody on either side of a block with the viewer.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { SITE_NAME } from "@/lib/config/site/constants";
import { visibleResidentWhere } from "@/lib/domain/users/profile-access";

export const SHOWCASE_PAGE_SIZE = 12;

export interface ShowcasePage {
  id: string;
  username: string;
  displayName: string | null;
}

export interface ShowcaseList {
  pages: ShowcasePage[];
  hasMore: boolean;
}

export function showcaseWhere(viewerId: string | null | undefined): Prisma.UserWhereInput {
  return {
    handles: { some: { host: SITE_NAME } },
    profile: {
      is: {
        templateMode: "advanced",
        showTemplateSource: true,
        visibility: "public",
        AND: [{ customTemplate: { not: null } }, { customTemplate: { not: "" } }],
      },
    },
    AND: [visibleResidentWhere(viewerId)],
  };
}

export async function listShowcase(
  db: Pick<PrismaClient, "user">,
  viewerId: string | null | undefined,
  { offset = 0, limit = SHOWCASE_PAGE_SIZE }: { offset?: number; limit?: number } = {}
): Promise<ShowcaseList> {
  const rows = await db.user.findMany({
    where: showcaseWhere(viewerId),
    orderBy: [{ profile: { templateCompiledAt: { sort: "desc", nulls: "last" } } }, { id: "desc" }],
    skip: offset,
    take: limit + 1,
    select: {
      id: true,
      handles: { where: { host: SITE_NAME }, select: { handle: true }, take: 1 },
      profile: { select: { displayName: true } },
    },
  });

  const pages = rows
    .slice(0, limit)
    .filter((row) => row.handles[0])
    .map((row) => ({ id: row.id, username: row.handles[0].handle, displayName: row.profile?.displayName ?? null }));
  return { pages, hasMore: rows.length > limit };
}

/** ?offset= as a whole number, 0 when missing or odd */
export function parseOffset(raw: unknown): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 10_000) : 0;
}
