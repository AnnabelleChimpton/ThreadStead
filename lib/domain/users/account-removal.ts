/**
 * Deleting an account, the deliberate second step after a ban
 * (EXTERNAL_AUDIT_REVIEW S-2).
 *
 * Ownership: Ring Hub owns PostRefs, ThreadStead owns posts and the user's
 * signing key (UserDID). A bare `db.user.delete` cascades the posts and the
 * UserDID row away but leaves every PostRef on the hub, which keeps serving
 * them in ring feeds and counting them in postCount. So the hub removal runs
 * first, while the key still exists:
 *
 *  - signed as the author (lib/domain/posts/ringhub-removal.ts does the same
 *    for one post). The hub's POST /trp/curate then marks every PostRef with
 *    the same uri + actorDid REMOVED, in all rings at once;
 *  - if the account has no key here, or the author call fails, signed as the
 *    ring owner (moderate_posts, that ring only), the same fallback as
 *    scripts/reconcile-orphan-postrefs.ts --owner-fallback.
 *
 * REMOVED PostRefs stay in the hub DB with an audit row but leave
 * GET /trp/rings/:slug/feed and the ring's count.
 *
 * Then the account leaves its rings, the same way: Ring Hub owns
 * memberships, keyed by the account's DID, and counts ACTIVE ones in
 * memberCount. POST /trp/leave signed as the member (the only way to list
 * them is GET /trp/my/memberships, signed as the member too), or, if that
 * fails, DELETE /trp/rings/:slug/members/:did signed as the ring owner.
 * An account with no key here never joined a ring as itself, so it has
 * nothing to leave.
 *
 * Rings the account OWNS block the delete: the hub refuses an owner's leave
 * while other members remain and can't hand a ring to anyone else, so after
 * the delete nobody could moderate it. The admin can still go ahead
 * (`force`); then each owned ring is left if the owner is its only member,
 * and otherwise stays on the hub with an owner who is gone.
 *
 * If any hub step fails the account is NOT deleted unless the admin says so
 * (`force`), because after the delete only the ring owner can clean up.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { ApiError } from "@/lib/api/errors";
import { getPublicRingHubClient, getRingHubClient, shouldUseRingHub } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { resolvePostRefId, type RingHubRemovablePost } from "@/lib/domain/posts/ringhub-removal";
import { isRestricted, MAX_REASON_LENGTH, MODERATION_SELECT } from "@/lib/domain/users/moderation";
import { recomputeSites, sitesTouchedBy } from "@/lib/indie-index/tiers";

export interface RingPostRemoval {
  postId: string;
  ringSlug: string;
  /** removed: this call took it off; covered: an earlier author call did; not_on_hub: nothing to remove. */
  outcome: "removed" | "covered" | "not_on_hub" | "failed";
  signer?: "author" | "owner";
  error?: string;
}

export interface UserHubCleanup {
  /** False when Ring Hub is off: nothing to clean up. */
  hubEnabled: boolean;
  /** Whether the account still has its signing key here. */
  hadKey: boolean;
  removals: RingPostRemoval[];
  failed: RingPostRemoval[];
}

export interface RingLeave {
  ringSlug: string;
  /**
   * left: off the member list (by the member, or removed by the ring owner);
   * not_member: the hub had no membership to end; still_owner: an owned ring
   * with other members, which the hub won't let its owner leave.
   */
  outcome: "left" | "not_member" | "still_owner" | "failed";
  signer?: "member" | "owner";
  error?: string;
}

export interface RingMembership {
  ringSlug: string;
  ringName: string;
  role: string | null;
  status: string;
}

export interface UserRingMemberships {
  hubEnabled: boolean;
  hadKey: boolean;
  memberships: RingMembership[];
  /** The hub wouldn't list them; set instead of throwing. */
  error?: string;
}

type Curator = { curatePost(postRefId: string, action: "remove", options?: { reason?: string }): Promise<any> };
type RingOwner = Curator & { removeMember(slug: string, memberDid: string): Promise<any> };
type MembershipReader = {
  getMyMemberships(options?: { status?: "ACTIVE" | "PENDING" | "REVOKED"; limit?: number; offset?: number }): Promise<{
    memberships: RingMembership[];
    hasMore: boolean;
  }>;
};
type Leaver = { leaveRing(slug: string): Promise<void> };

/**
 * Who can moderate each ring here: its owner's key, or the instance's own
 * DID for rings the server created. Looked up once per ring.
 */
function ringOwners(reader: { getRing(slug: string): Promise<{ ownerDid?: string } | null> }) {
  const owners = new Map<string, Promise<RingOwner | null>>();
  return (slug: string) => {
    if (!owners.has(slug)) {
      owners.set(
        slug,
        (async () => {
          const ring = await reader.getRing(slug);
          if (!ring?.ownerDid) return null;
          if (ring.ownerDid === process.env.THREADSTEAD_DID) return getRingHubClient();
          const key = await db.userDID.findUnique({ where: { did: ring.ownerDid }, select: { userId: true } });
          return key ? createAuthenticatedRingHubClient(key.userId) : null;
        })()
      );
    }
    return owners.get(slug)!;
  };
}

function errorText(error: any): string {
  return [error?.status, error?.message ?? String(error)].filter(Boolean).join(" ");
}

/** Every ring a post was ever submitted to: PostThreadRing rows plus stored PostRef ids. */
function ringSlugsOf(post: RingHubRemovablePost): string[] {
  const stored = Object.keys((post.threadRingPostIds as Record<string, string> | null) || {});
  return [...new Set([...post.threadRings.map((r) => r.threadRing.slug), ...stored])];
}

/**
 * Take every ring post of `userId` off Ring Hub. Never throws for a hub
 * failure: each one comes back in `failed`.
 */
export async function removeUserPostsFromRingHub(userId: string, reason: string): Promise<UserHubCleanup> {
  const result: UserHubCleanup = { hubEnabled: shouldUseRingHub(), hadKey: false, removals: [], failed: [] };
  const reader = result.hubEnabled ? getPublicRingHubClient() : null;
  if (!reader) return { ...result, hubEnabled: false };

  const posts = await db.post.findMany({
    where: { authorId: userId, OR: [{ threadRings: { some: {} } }, { threadRingPostIds: { not: Prisma.DbNull } }] },
    select: {
      id: true,
      authorId: true,
      threadRingPostIds: true,
      author: { select: { primaryHandle: true } },
      threadRings: { select: { threadRing: { select: { slug: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (posts.length === 0) return result;

  // Only sign as the author with the key the hub knows. Without a UserDID
  // row the client would mint a new key, which the hub has never seen.
  result.hadKey = !!(await db.userDID.findUnique({ where: { userId }, select: { userId: true } }));
  const author: Curator | null = result.hadKey ? createAuthenticatedRingHubClient(userId) : null;
  const hubReason = reason.slice(0, MAX_REASON_LENGTH);

  const ownerOf = ringOwners(reader);

  for (const post of posts) {
    const covered = new Set<string>();
    for (const ringSlug of ringSlugsOf(post)) {
      const record = (r: Omit<RingPostRemoval, "postId" | "ringSlug">) => {
        const row = { postId: post.id, ringSlug, ...r };
        result.removals.push(row);
        if (row.outcome === "failed") result.failed.push(row);
      };
      if (covered.has(ringSlug)) {
        record({ outcome: "covered", signer: "author" });
        continue;
      }

      let postRefId: string | null;
      try {
        postRefId = await resolvePostRefId(reader, post, ringSlug);
      } catch (error) {
        record({ outcome: "failed", error: `couldn't read the ring feed: ${errorText(error)}` });
        continue;
      }
      if (!postRefId) {
        record({ outcome: "not_on_hub" });
        continue;
      }

      let authorError: string | undefined;
      if (author) {
        try {
          const response = await author.curatePost(postRefId, "remove", { reason: hubReason });
          for (const ring of response?.affectedRings ?? []) covered.add(ring.slug);
          record({ outcome: "removed", signer: "author" });
          continue;
        } catch (error: any) {
          // A stored PostRef id the hub no longer has: nothing left to remove.
          if (error?.status === 404) {
            record({ outcome: "not_on_hub" });
            continue;
          }
          authorError = errorText(error);
        }
      }

      try {
        const owner = await ownerOf(ringSlug);
        if (!owner) {
          record({
            outcome: "failed",
            error: [authorError && `as author: ${authorError}`, "the ring owner has no key here"]
              .filter(Boolean)
              .join("; "),
          });
          continue;
        }
        await owner.curatePost(postRefId, "remove", { reason: hubReason });
        record({ outcome: "removed", signer: "owner" });
      } catch (error: any) {
        if (error?.status === 404) {
          record({ outcome: "not_on_hub" });
          continue;
        }
        record({
          outcome: "failed",
          error: [authorError && `as author: ${authorError}`, `as ring owner: ${errorText(error)}`]
            .filter(Boolean)
            .join("; "),
        });
      }
    }
  }
  return result;
}

// The hub caps /trp/my/memberships at 100 a page (ring-submission.ts pages the same way).
const MEMBERSHIP_PAGE_SIZE = 100;

/**
 * The account's ACTIVE and PENDING ring memberships on the hub, read as the
 * account. Never throws: a hub failure comes back in `error`.
 */
export async function listUserRingMemberships(userId: string): Promise<UserRingMemberships> {
  const result: UserRingMemberships = { hubEnabled: shouldUseRingHub(), hadKey: false, memberships: [] };
  if (!result.hubEnabled || !getPublicRingHubClient()) return { ...result, hubEnabled: false };

  result.hadKey = !!(await db.userDID.findUnique({ where: { userId }, select: { userId: true } }));
  if (!result.hadKey) return result;

  const member: MembershipReader = createAuthenticatedRingHubClient(userId);
  try {
    for (const status of ["ACTIVE", "PENDING"] as const) {
      for (let offset = 0; ; offset += MEMBERSHIP_PAGE_SIZE) {
        const page = await member.getMyMemberships({ status, limit: MEMBERSHIP_PAGE_SIZE, offset });
        result.memberships.push(
          ...page.memberships.map((m) => ({ ringSlug: m.ringSlug, ringName: m.ringName, role: m.role, status: m.status }))
        );
        if (!page.hasMore || page.memberships.length < MEMBERSHIP_PAGE_SIZE) break;
      }
    }
  } catch (error) {
    result.error = `couldn't list their rings: ${errorText(error)}`;
  }
  return result;
}

/** The rings in this list the account owns. */
export function ownedRings(memberships: RingMembership[]): RingMembership[] {
  return memberships.filter((m) => m.role === "owner" && m.status === "ACTIVE");
}

/**
 * End each membership on the hub: left as the member, or removed by the ring
 * owner when that fails. An owned ring the hub won't let its owner leave
 * (other members remain) is reported as still_owner, not failed. Never throws.
 */
export async function leaveUserRingsOnHub(userId: string, memberships: RingMembership[]): Promise<RingLeave[]> {
  const reader = getPublicRingHubClient();
  if (!reader || memberships.length === 0) return [];
  const key = await db.userDID.findUnique({ where: { userId }, select: { did: true } });
  if (!key) return [];

  const member: Leaver = createAuthenticatedRingHubClient(userId);
  const ownerOf = ringOwners(reader);
  const leaves: RingLeave[] = [];

  for (const membership of memberships) {
    const ringSlug = membership.ringSlug;
    const owns = membership.role === "owner";
    let memberError: string;
    try {
      await member.leaveRing(ringSlug);
      leaves.push({ ringSlug, outcome: "left", signer: "member" });
      continue;
    } catch (error: any) {
      if (error?.status === 404) {
        leaves.push({ ringSlug, outcome: "not_member" });
        continue;
      }
      // The hub's "Transfer ownership required": an owner with other members.
      if (owns && error?.status === 400) {
        leaves.push({ ringSlug, outcome: "still_owner", error: errorText(error) });
        continue;
      }
      memberError = errorText(error);
    }

    // The ring owner can't remove themselves, so an owned ring ends here.
    if (owns) {
      leaves.push({ ringSlug, outcome: "failed", error: `as member: ${memberError}` });
      continue;
    }
    try {
      const owner = await ownerOf(ringSlug);
      if (!owner) {
        leaves.push({ ringSlug, outcome: "failed", error: `as member: ${memberError}; the ring owner has no key here` });
        continue;
      }
      await owner.removeMember(ringSlug, key.did);
      leaves.push({ ringSlug, outcome: "left", signer: "owner" });
    } catch (error: any) {
      leaves.push(
        error?.status === 404
          ? { ringSlug, outcome: "not_member" }
          : { ringSlug, outcome: "failed", error: `as member: ${memberError}; as ring owner: ${errorText(error)}` }
      );
    }
  }
  return leaves;
}

export interface DeleteAccountOptions {
  actorId: string;
  userId: string;
  /** Delete even though some hub cleanup failed, or the account owns rings. */
  force?: boolean;
  reason?: string;
}

export interface AccountRemovalReport {
  posts: UserHubCleanup;
  /** The memberships the hub listed (empty without a key or with the hub off). */
  memberships: RingMembership[];
  /** Rings the account owns on the hub. */
  ownedRings: RingMembership[];
  leaves: RingLeave[];
  /** Every hub step that failed, posts and rings, as one readable line each. */
  failures: string[];
}

export type DeleteAccountResult = {
  deleted: boolean;
  /** Why nothing was deleted: the account owns rings, or a hub step failed. */
  blockedBy?: "owns_rings" | "hub_failures";
  handle: string | null;
  report: AccountRemovalReport;
};

function failureLines(posts: UserHubCleanup, rings: UserRingMemberships, leaves: RingLeave[]): string[] {
  return [
    ...posts.failed.map((f) => `post ${f.postId} in ${f.ringSlug}: ${f.error}`),
    ...(rings.error ? [rings.error] : []),
    ...leaves.filter((l) => l.outcome === "failed").map((l) => `leaving ${l.ringSlug}: ${l.error}`),
  ];
}

/** Re-tier the Indie Index sites the account touched, once its signals are gone. */
async function retierIndieSites(siteIds: string[]): Promise<void> {
  try {
    await recomputeSites(db, siteIds);
  } catch (error) {
    console.error("Couldn't update Indie Index tiers after deleting an account:", error);
  }
}

/**
 * Hard-delete a banned account. Refuses (deletes nothing, changes nothing)
 * while it owns rings, unless forced. Then the hub cleanup: ring posts off,
 * rings left. Then one transaction that writes the "delete"
 * ModerationAction row (it outlives the account, with userId nulled and the
 * handle kept), fixes local ring post and member counts, and deletes the
 * User (posts, memberships, sessions, UserDID and the rest cascade).
 */
export async function deleteUserAccount({
  actorId,
  userId,
  force = false,
  reason,
}: DeleteAccountOptions): Promise<DeleteAccountResult> {
  if (userId === actorId) throw new ApiError(400, "You can't delete your own account from here");
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, primaryHandle: true, ...MODERATION_SELECT },
  });
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin") throw new ApiError(400, "Admins can't be deleted from here");
  if (target.moderationStatus !== "banned" || !isRestricted(target)) {
    throw new ApiError(409, "Ban the account first. Deleting is the second step.");
  }

  const rings = await listUserRingMemberships(userId);
  const owned = ownedRings(rings.memberships);
  if (owned.length > 0 && !force) {
    const posts: UserHubCleanup = { hubEnabled: rings.hubEnabled, hadKey: rings.hadKey, removals: [], failed: [] };
    return {
      deleted: false,
      blockedBy: "owns_rings",
      handle: target.primaryHandle,
      report: { posts, memberships: rings.memberships, ownedRings: owned, leaves: [], failures: failureLines(posts, rings, []) },
    };
  }

  const note = reason?.trim() || undefined;
  const posts = await removeUserPostsFromRingHub(userId, `Account removed by an admin${note ? `: ${note}` : ""}`);
  const leaves = await leaveUserRingsOnHub(userId, rings.memberships);
  const report: AccountRemovalReport = {
    posts,
    memberships: rings.memberships,
    ownedRings: owned,
    leaves,
    failures: failureLines(posts, rings, leaves),
  };
  if (report.failures.length > 0 && !force) {
    return { deleted: false, blockedBy: "hub_failures", handle: target.primaryHandle, report };
  }

  const indieSites = await sitesTouchedBy(db, userId);
  await db.$transaction([
    db.moderationAction.create({
      data: {
        action: "delete",
        userId,
        userHandle: target.primaryHandle,
        actorId,
        reason: note?.slice(0, MAX_REASON_LENGTH) ?? null,
      },
    }),
    // Same as pages/api/posts/delete.ts: the cascade drops PostThreadRing
    // rows but not ThreadRing.postCount.
    db.$executeRaw`
      UPDATE "ThreadRing" tr
      SET "postCount" = GREATEST(tr."postCount" - c.n, 0)
      FROM (
        SELECT ptr."threadRingId", count(*)::int AS n
        FROM "PostThreadRing" ptr JOIN "Post" p ON p.id = ptr."postId"
        WHERE p."authorId" = ${userId}
        GROUP BY ptr."threadRingId"
      ) c
      WHERE tr.id = c."threadRingId"
    `,
    // Same for ThreadRingMember rows and memberCount (pages/api/threadrings/[slug]/leave.ts).
    db.$executeRaw`
      UPDATE "ThreadRing" tr
      SET "memberCount" = GREATEST(tr."memberCount" - 1, 0)
      FROM "ThreadRingMember" m
      WHERE m."threadRingId" = tr.id AND m."userId" = ${userId}
    `,
    db.user.delete({ where: { id: userId } }),
  ]);
  await retierIndieSites(indieSites);

  return { deleted: true, handle: target.primaryHandle, report };
}
