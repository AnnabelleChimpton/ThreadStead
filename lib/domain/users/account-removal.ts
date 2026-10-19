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
 * GET /trp/rings/:slug/feed and the ring's count. If any removal fails the
 * account is NOT deleted unless the admin says so (`force`), because after
 * the delete only the ring owner can clean up.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { ApiError } from "@/lib/api/errors";
import { getPublicRingHubClient, getRingHubClient, shouldUseRingHub } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { resolvePostRefId, type RingHubRemovablePost } from "@/lib/domain/posts/ringhub-removal";
import { isRestricted, MAX_REASON_LENGTH, MODERATION_SELECT } from "@/lib/domain/users/moderation";

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

type Curator = { curatePost(postRefId: string, action: "remove", options?: { reason?: string }): Promise<any> };

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

  // Who can moderate each ring here: its owner's key, or the instance's own
  // DID for rings the server created. Looked up once per ring.
  const owners = new Map<string, Promise<Curator | null>>();
  const ownerOf = (slug: string) => {
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

export interface DeleteAccountOptions {
  actorId: string;
  userId: string;
  /** Delete even though some ring posts couldn't come off the hub. */
  force?: boolean;
  reason?: string;
}

export type DeleteAccountResult =
  | { deleted: true; handle: string | null; cleanup: UserHubCleanup }
  | { deleted: false; handle: string | null; cleanup: UserHubCleanup };

/**
 * Hard-delete a banned account: hub cleanup first, then one transaction that
 * writes the "delete" ModerationAction row (it outlives the account, with
 * userId nulled and the handle kept), fixes local ring post counts, and
 * deletes the User (posts, sessions, UserDID and the rest cascade).
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

  const note = reason?.trim() || undefined;
  const cleanup = await removeUserPostsFromRingHub(
    userId,
    `Account removed by an admin${note ? `: ${note}` : ""}`
  );
  if (cleanup.failed.length > 0 && !force) {
    return { deleted: false, handle: target.primaryHandle, cleanup };
  }

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
    db.user.delete({ where: { id: userId } }),
  ]);

  return { deleted: true, handle: target.primaryHandle, cleanup };
}
