/**
 * Remove a ThreadStead post's PostRefs from Ring Hub before the local post is
 * deleted. Shared by author deletion (pages/api/posts/delete.ts) and admin
 * deletion (pages/api/admin/delete-post.ts).
 *
 * Ownership: Ring Hub owns PostRefs, ThreadStead owns posts. create.ts submits
 * each PostRef signed as the AUTHOR and records the hub's PostRef id per ring
 * in post.threadRingPostIds[slug]. The hub's POST /trp/curate looks the ref up
 * by that PostRef id (never by our local post id) and only lets the author
 * (actorDid / submittedBy) or a ring moderator act on it, so removal is signed
 * as the author. An author removal is global on the hub (every ref with the
 * same uri + actorDid), so one successful call usually covers every ring.
 *
 * Never throws: a hub failure must not block local deletion.
 */

import { shouldUseRingHub } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { buildPostUri } from "@/lib/domain/posts/ringhub-metadata";

/** Hub feed page cap (GET /trp/rings/:slug/feed allows at most 100). */
const FEED_PAGE_SIZE = 100;

export interface RingHubRemovablePost {
  id: string;
  authorId: string;
  author: { primaryHandle: string | null };
  threadRingPostIds: unknown;
  threadRings: Array<{ threadRing: { slug: string } }>;
}

export interface RingHubRemovalResult {
  /** True when the hub confirmed at least one removal. */
  synced: boolean;
  /** Ring slugs the hub reported as removed. */
  affectedRings: string[];
}

type HubClient = ReturnType<typeof createAuthenticatedRingHubClient>;

/**
 * Find the hub PostRef id for this post in one ring: the stored id when
 * create.ts recorded it, otherwise match the canonical URI in the ring feed
 * (posts created before threadRingPostIds existed).
 */
export async function resolvePostRefId(
  client: Pick<HubClient, "getRingFeed">,
  post: RingHubRemovablePost,
  ringSlug: string
): Promise<string | null> {
  const storedIds = (post.threadRingPostIds as Record<string, string> | null) || {};
  if (storedIds[ringSlug]) return storedIds[ringSlug];

  console.warn(`No stored ThreadRing post ID for ring ${ringSlug}, falling back to URI matching`);
  const postUri = buildPostUri(post.author.primaryHandle, post.id);
  for (let offset = 0; ; offset += FEED_PAGE_SIZE) {
    const feed = await client.getRingFeed(ringSlug, { limit: FEED_PAGE_SIZE, offset });
    const match = feed.posts.find((ref) => ref.uri === postUri);
    if (match?.id) return match.id;
    if (feed.posts.length < FEED_PAGE_SIZE || offset + feed.posts.length >= feed.total) return null;
  }
}

export async function removePostFromRingHub(
  post: RingHubRemovablePost,
  reason: string
): Promise<RingHubRemovalResult> {
  const result: RingHubRemovalResult = { synced: false, affectedRings: [] };
  if (post.threadRings.length === 0 || !shouldUseRingHub()) return result;

  const client = createAuthenticatedRingHubClient(post.authorId);
  const covered = new Set<string>();

  for (const { threadRing } of post.threadRings) {
    const ringSlug = threadRing.slug;
    // An earlier author removal already reached this ring.
    if (covered.has(ringSlug)) continue;

    try {
      const postRefId = await resolvePostRefId(client, post, ringSlug);
      if (!postRefId) {
        console.warn(`Could not find PostRef for post ${post.id} in ring ${ringSlug}`);
        continue;
      }

      const response = await client.curatePost(postRefId, "remove", { reason });
      covered.add(ringSlug);
      for (const ring of response.affectedRings ?? []) covered.add(ring.slug);
    } catch (error: any) {
      console.error(`Failed to remove post ${post.id} from ring ${ringSlug} on RingHub:`, {
        error: error?.message,
        status: error?.status,
      });
    }
  }

  result.affectedRings = [...covered];
  result.synced = covered.size > 0;
  return result;
}
