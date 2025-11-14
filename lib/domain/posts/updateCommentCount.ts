import { db } from "@/lib/config/database/connection";

/**
 * Updates the PostMetrics.commentCount for a post by a delta value.
 * This should be called when comments are created or their status changes.
 *
 * @param postId - The ID of the post to update
 * @param delta - The change in count (+1 for create, -1 for delete/hide)
 */
export async function updateCommentCount(postId: string, delta: number): Promise<void> {
  try {
    await db.postMetrics.upsert({
      where: { postId },
      create: {
        postId,
        commentCount: Math.max(0, delta),
        viewCount: 0,
        uniqueViewCount: 0,
      },
      update: {
        commentCount: {
          increment: delta,
        },
      },
    });
  } catch (error) {
    console.error(`Failed to update comment count for post ${postId}:`, error);
    // Don't throw - we don't want to fail the main operation if metrics update fails
  }
}
