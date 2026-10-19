/**
 * Who can see a resident's profile and its profile-level things: the
 * profile API (pages/api/profile/[username].ts), ring badges, quick view,
 * the directory, and their pixel home, its decorations, sign, visitors,
 * threadbook and guestbook.
 *
 * Profile.visibility follows the post rules (lib/domain/posts/visibility.ts):
 * the owner always, admins always, public for everyone, followers and
 * friends by accepted follows, private for nobody else. On top of that, a
 * block in either direction hides it, the same as search does
 * (lib/search/local.ts). No profile row means public.
 *
 * A suspended or banned account (lib/domain/users/moderation.ts) is hidden
 * from everyone, admins and lists included: residentAccess reports it as
 * `suspended`, which the profile and home pages turn into a 404.
 */
import type { NextApiResponse } from "next";
import type { Prisma, UserRole, Visibility } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { canViewPost, getViewerRelationship } from "@/lib/domain/posts/visibility";
import { isUserBlocked } from "@/lib/domain/users/blocks";
import { activeUserWhere, isUserRestricted } from "@/lib/domain/users/moderation";

type HiddenVisibility = Exclude<Visibility, "public">;

export type ResidentAccess =
  | { visible: true }
  | { visible: false; visibility: HiddenVisibility; blocked: boolean; suspended?: boolean };

type Viewer = { id: string; role?: UserRole | string | null } | null | undefined;

const VISIBLE: ResidentAccess = { visible: true };
const SUSPENDED: ResidentAccess = { visible: false, visibility: "private", blocked: false, suspended: true };

/**
 * Whether `viewer` may see `ownerId`'s home. Pass the owner's
 * Profile.visibility when it's already loaded (null = no profile row);
 * leave it out to look it up. A block reads as "private", so the page
 * doesn't tell anyone they were blocked. A suspended or banned owner reads
 * as private too, with `suspended: true`, for callers that 404 instead.
 */
export async function residentAccess(
  viewer: Viewer,
  ownerId: string,
  knownVisibility?: Visibility | null
): Promise<ResidentAccess> {
  if (await isUserRestricted(ownerId)) return SUSPENDED;
  if (viewer?.id === ownerId) return VISIBLE;

  if (viewer) {
    const [viewerBlocked, ownerBlocked] = await Promise.all([
      isUserBlocked(viewer.id, ownerId),
      isUserBlocked(ownerId, viewer.id),
    ]);
    if (viewerBlocked || ownerBlocked) return { visible: false, visibility: "private", blocked: true };
  }

  const visibility =
    knownVisibility !== undefined
      ? knownVisibility ?? "public"
      : (await db.profile.findUnique({ where: { userId: ownerId }, select: { visibility: true } }))?.visibility ??
        "public";

  if (visibility === "public" || viewer?.role === "admin") return VISIBLE;

  const rel = await getViewerRelationship(viewer?.id, ownerId);
  return canViewPost(visibility, rel) ? VISIBLE : { visible: false, visibility, blocked: false };
}

/**
 * The same rules as a Prisma filter on User, for lists of people and homes
 * (the street, ring neighborhoods, random house, the directory and New
 * Neighbors). Hidden homes are left out, not shown as empty plots. Lists have
 * no admin exception, like search, and never include a suspended or banned
 * account.
 */
export function visibleResidentWhere(viewerId: string | null | undefined): Prisma.UserWhereInput {
  const isPublic: Prisma.UserWhereInput[] = [
    { profile: { is: null } },
    { profile: { is: { visibility: "public" } } },
  ];
  if (!viewerId) return { AND: [activeUserWhere(), { OR: isPublic }] };

  const viewerFollows = { followers: { some: { followerId: viewerId, status: "accepted" } } };
  const followsViewer = { following: { some: { followeeId: viewerId, status: "accepted" } } };
  return {
    AND: [
      activeUserWhere(),
      {
        OR: [
          { id: viewerId },
          ...isPublic,
          { profile: { is: { visibility: "followers" } }, ...viewerFollows },
          { profile: { is: { visibility: "friends" } }, ...viewerFollows, ...followsViewer },
        ],
      },
      { blocksCreated: { none: { blockedUserId: viewerId } } },
      { blocksReceived: { none: { blockerId: viewerId } } },
    ],
  };
}

/**
 * The neighbors: residents of this instance with a public profile (or none),
 * minus suspended and banned accounts and anyone on either side of a block
 * with the viewer. The directory lists these and the homepage counts them,
 * so the two numbers always agree.
 */
export function neighborWhere(viewerId: string | null | undefined): Prisma.UserWhereInput {
  return {
    handles: { some: { host: SITE_NAME } },
    AND: [
      // Profiles that aren't public 403 on view, so they don't belong in a
      // public directory (with their bio).
      { OR: [{ profile: { is: null } }, { profile: { is: { visibility: "public" } } }] },
      visibleResidentWhere(viewerId),
    ],
  };
}

/** How many neighbors there are, for this viewer (see neighborWhere). */
export function countNeighbors(viewerId: string | null | undefined): Promise<number> {
  return db.user.count({ where: neighborWhere(viewerId) });
}

/**
 * Whether the resident has a pixel home: a UserHomeConfig row (signup makes
 * one). This says nothing about who may see it; ask residentAccess first.
 * The profile's "Step back outside" link and quick view's "Pixel home" use it.
 */
export async function hasPixelHome(ownerId: string): Promise<boolean> {
  const home = await db.userHomeConfig.findUnique({ where: { userId: ownerId }, select: { userId: true } });
  return home !== null;
}

/** The 403 the profile API sends for a profile the viewer can't see. */
export function sendPrivateProfile(res: NextApiResponse, visibility: HiddenVisibility) {
  return res.status(403).json({ error: "private_profile", visibility });
}
